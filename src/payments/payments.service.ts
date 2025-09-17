// src/payments/payments.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { TicketsService } from 'src/tickets/tickets.service';
import { User } from 'src/users/user.entity';
import { TicketTiersService } from 'src/ticket-tiers/ticket-tiers.service';
import { AcquireTicketDto } from 'src/tickets/dto/acquire-ticket.dto';
import { ConfigurationService } from 'src/configuration/configuration.service';
import { StoreService } from 'src/store/store.service';
import { UsersService } from 'src/users/users.service';
import axios from 'axios'; // Importamos axios para la llamada OAuth

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private mpClient: MercadoPagoConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => TicketsService))
    private readonly ticketsService: TicketsService,
    private readonly ticketTiersService: TicketTiersService,
    private readonly configurationService: ConfigurationService,
    private readonly storeService: StoreService,
  ) {
    const accessToken = this.configService.get<string>(
      'MERCADO_PAGO_ACCESS_TOKEN',
    );
    if (!accessToken) {
      this.logger.error(
        '[Constructor] MERCADO_PAGO_ACCESS_TOKEN no está configurado en .env',
      );
      throw new InternalServerErrorException(
        'La integración con Mercado Pago no está configurada.',
      );
    }
    this.mpClient = new MercadoPagoConfig({ accessToken });
  }

  async createPreference(
    buyer: User,
    data: AcquireTicketDto & { promoterUsername?: string },
  ) {
    this.logger.log(
      `[createPreference] Iniciando para comprador: ${buyer.email} | Tier: ${data.ticketTierId}`,
    );

    const { ticketTierId, quantity, promoterUsername, paymentType = 'full' } =
      data;

    const tier = await this.ticketTiersService.findOne(ticketTierId);
    if (!tier) throw new NotFoundException('Tipo de entrada no encontrado.');
    if (tier.quantity < quantity)
      throw new BadRequestException('No quedan suficientes entradas.');

    const paymentsEnabled = await this.configurationService.get(
      'paymentsEnabled',
    );
    if (tier.isFree || paymentsEnabled !== 'true') {
      this.logger.log(
        '[createPreference] Tier es gratuito o pagos desactivados. Creando ticket sin costo.',
      );
      const ticket = await this.ticketsService.acquireForClient(
        buyer,
        data,
        promoterUsername ?? null,
        0,
        null,
      );
      return {
        type: 'free',
        ticketId: ticket.id,
        message: 'Producto adquirido con éxito.',
      };
    }

    let amountToPay: number;
    if (
      paymentType === 'partial' &&
      tier.allowPartialPayment &&
      tier.partialPaymentPrice
    ) {
      amountToPay = Number(tier.partialPaymentPrice) * quantity;
    } else {
      amountToPay = Number(tier.price) * quantity;
    }

    const externalReference = JSON.stringify({
      type: 'TICKET_PURCHASE',
      buyerId: buyer.id,
      eventId: tier.event.id,
      ticketTierId,
      quantity,
      promoterUsername,
      amountPaid: amountToPay,
      paymentType,
    });

    const backUrls = {
      success: `${await this.configurationService.get('FRONTEND_URL')}/payment/success`,
      failure: `${await this.configurationService.get('FRONTEND_URL')}/payment/failure`,
    };
    const notificationUrl = `${await this.configurationService.get('BACKEND_URL')}/payments/webhook`;

    const preferenceBody: any = {
      items: [
        {
          id: tier.id,
          title: `${tier.name} x ${quantity}`,
          quantity: 1,
          unit_price: amountToPay,
          currency_id: 'ARS',
        },
      ],
      payer: {
        email: buyer.email,
        name: buyer.name,
        surname: '',
      },
      back_urls: backUrls,
      notification_url: notificationUrl,
      external_reference: externalReference,
    };

    try {
      this.logger.log(`[createPreference] Creando preferencia de pago estándar.`);
      const preference = new Preference(this.mpClient);
      const result = await preference.create({ body: preferenceBody });

      return {
        type: 'payment',
        preferenceId: result.id,
      };
    } catch (error) {
      this.logger.error(
        'Error al crear la preferencia de pago en Mercado Pago',
        error.response?.data || error.message,
      );
      throw new InternalServerErrorException(
        'No se pudo generar el link de pago.',
      );
    }
  }

  private async processApprovedPayment(paymentId: string) {
    this.logger.log(
      `[processApprovedPayment] Iniciando para paymentId: ${paymentId}`,
    );

    const payment = new Payment(this.mpClient);
    const paymentInfo = await payment.get({ id: paymentId });

    if (paymentInfo.status !== 'approved') {
      throw new BadRequestException(
        `El pago no ha sido aprobado. Estado actual: ${paymentInfo.status}`,
      );
    }

    const externalReference = paymentInfo.external_reference;
    if (!externalReference) {
      throw new InternalServerErrorException(
        'El pago no contiene la información necesaria (external_reference).',
      );
    }

    const data = JSON.parse(externalReference as string);
    const buyer = await this.usersService.findOneById(data.buyerId);
    if (!buyer) throw new NotFoundException('Comprador no encontrado.');

    if (data.type === 'PRODUCT_PURCHASE') {
      const existingProduct =
        await this.storeService.findPurchaseByPaymentId(paymentId);
      if (existingProduct) {
        this.logger.warn(
          `[Idempotencia] El pago ${paymentId} ya fue procesado para un PRODUCTO.`,
        );
        return { type: 'product', data: existingProduct };
      }
      this.logger.log(`Procesando pago de PRODUCTO para ${paymentId}`);
      const purchases = await this.storeService.finalizePurchase({
        ...data,
        paymentId,
      });
      return { type: 'product', data: purchases };
    } else if (data.type === 'TICKET_PURCHASE') {
      const existingTicket =
        await this.ticketsService.findOneByPaymentId(paymentId);
      if (existingTicket) {
        this.logger.warn(
          `[Idempotencia] El pago ${paymentId} ya fue procesado para un TICKET.`,
        );
        return { type: 'ticket', data: existingTicket };
      }
      this.logger.log(`Procesando pago de TICKET para ${paymentId}`);
      const ticket = await this.ticketsService.acquireForClient(
        buyer,
        data,
        data.promoterUsername,
        data.amountPaid,
        paymentId,
      );
      return { type: 'ticket', data: ticket };
    }
  }

  public async finalizePurchase(paymentId: string, user: User) {
    this.logger.log(
      `[finalizePurchase] El usuario ${user.email} solicita finalizar la compra para el pago ${paymentId}`,
    );
    const result = await this.processApprovedPayment(paymentId);
    return {
      message: 'Pago verificado y producto obtenido exitosamente.',
      ...result,
    };
  }

  public async handleWebhook(paymentData: { id: string }) {
    const paymentId = String(paymentData.id);
    this.logger.log(
      `[handleWebhook] Webhook recibido para paymentId: ${paymentId}`,
    );
    try {
      await this.processApprovedPayment(paymentId);
      this.logger.log(
        `[handleWebhook] Webhook para paymentId: ${paymentId} procesado con éxito.`,
      );
    } catch (error) {
      this.logger.error(
        `Error procesando webhook para paymentId: ${paymentId}`,
        error,
      );
    }
  }

  getMercadoPagoAuthUrl(userId: string): string {
    const clientId = this.configService.get('MP_CLIENT_ID');
    const redirectUri = this.configService.get('MP_REDIRECT_URI');
    // Usamos el userId en el `state` para saber a quién asignarle las credenciales en el callback
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    return `https://auth.mercadopago.com.ar/authorization?client_id=${clientId}&response_type=code&platform_id=mp&redirect_uri=${redirectUri}&state=${state}`;
  }

  async exchangeCodeForAccessToken(
    state: string,
    code: string,
  ): Promise<void> {
    let userId: string;
    try {
      const decodedState = JSON.parse(
        Buffer.from(state, 'base64').toString('ascii'),
      );
      userId = decodedState.userId;
      if (!userId) throw new Error('User ID no encontrado en el state');
    } catch (error) {
      throw new InternalServerErrorException(
        'Parámetro de estado inválido o malformado.',
      );
    }

    const clientId = this.configService.get('MP_CLIENT_ID');
    const clientSecret = this.configService.get('MP_CLIENT_SECRET');
    const redirectUri = this.configService.get('MP_REDIRECT_URI');

    try {
      const response = await axios.post(
        'https://api.mercadopago.com/oauth/token',
        {
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        },
      );
      const { access_token, user_id } = response.data;
      await this.usersService.updateMercadoPagoCredentials(
        userId,
        access_token,
        user_id,
      );
      this.logger.log(
        `[exchangeCodeForAccessToken] Credenciales de MP actualizadas para el usuario ID: ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        'Error intercambiando el código por el access token:',
        error.response?.data,
      );
      throw new InternalServerErrorException(
        'Error al vincular la cuenta de Mercado Pago.',
      );
    }
  }
}