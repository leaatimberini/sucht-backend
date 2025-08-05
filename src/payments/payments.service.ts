// backend/src/payments/payments.service.ts
import { BadRequestException, Injectable, NotFoundException, InternalServerErrorException, UnauthorizedException, Logger, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { TicketsService } from 'src/tickets/tickets.service';
import { UsersService } from 'src/users/users.service';
import { User } from 'src/users/user.entity';
import { TicketTiersService } from 'src/ticket-tiers/ticket-tiers.service';
import { AcquireTicketDto } from 'src/tickets/dto/acquire-ticket.dto';
import { ConfigurationService } from 'src/configuration/configuration.service';
import axios from 'axios';
import { Ticket } from 'src/tickets/ticket.entity';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly ticketsService: TicketsService,
    private readonly ticketTiersService: TicketTiersService,
    private readonly configurationService: ConfigurationService,
  ) {}

  private async processApprovedPayment(paymentId: string): Promise<Ticket> {
    this.logger.log(`Iniciando procesamiento para el paymentId: ${paymentId}`);

    const existingTicket = await this.ticketsService.findOneByPaymentId(paymentId);
    if (existingTicket) {
      this.logger.log(`El pago ${paymentId} ya fue procesado anteriormente. Se devuelve el ticket existente.`);
      return existingTicket;
    }

    const owner = await this.usersService.findOwner();
    if (!owner?.mpAccessToken) {
      this.logger.error("Error crítico: La cuenta del dueño no tiene un Access Token de MP configurado.");
      throw new InternalServerErrorException("La cuenta del dueño no tiene un Access Token de MP configurado.");
    }

    const mpClient = new MercadoPagoConfig({ accessToken: owner.mpAccessToken });
    const payment = new Payment(mpClient);
    const paymentInfo = await payment.get({ id: paymentId });

    if (paymentInfo.status !== 'approved') {
      this.logger.warn(`Intento de procesar pago ${paymentId} no aprobado. Estado: ${paymentInfo.status}`);
      throw new BadRequestException(`El pago no ha sido aprobado. Estado actual: ${paymentInfo.status}`);
    }

    const externalReference = paymentInfo.external_reference;
    if (!externalReference) {
      this.logger.error(`El pago ${paymentId} fue aprobado pero no tiene external_reference.`);
      throw new InternalServerErrorException('El pago no contiene la información necesaria para crear el ticket.');
    }

    const data = JSON.parse(externalReference as string);
    const buyer = await this.usersService.findOneById(data.buyerId);
    if (!buyer) {
      this.logger.error(`Comprador con ID ${data.buyerId} del pago ${paymentId} no fue encontrado.`);
      throw new NotFoundException('Comprador no encontrado.');
    }
    
    this.logger.log(`Creando ticket para el usuario ${buyer.email} asociado al pago ${paymentId}`);
    return this.ticketsService.acquireForClient(buyer, data, data.promoterUsername, data.amountPaid, paymentId);
  }

  async createPreference(buyer: User, data: AcquireTicketDto & { promoterUsername?: string }) {
    const { eventId, ticketTierId, quantity, promoterUsername, paymentType = 'full' } = data;

    const tier = await this.ticketTiersService.findOne(ticketTierId);
    if (!tier) throw new NotFoundException('Tipo de entrada no encontrado.');
    if (tier.quantity < quantity) throw new BadRequestException('No quedan suficientes entradas.');

    const paymentsEnabled = await this.configurationService.get('paymentsEnabled');
    if (tier.isFree || paymentsEnabled !== 'true') {
      // ===============================================
      // ===== AQUÍ ESTÁ LA CORRECCIÓN: "?? null" =====
      // ===============================================
      const ticket = await this.ticketsService.acquireForClient(buyer, data, promoterUsername ?? null, 0, null);
      return { type: 'free', ticketId: ticket.id, message: 'Producto adquirido con éxito.' };
    }

    let amountToPay: number;

    if (paymentType === 'partial') {
      if (!tier.allowPartialPayment || !tier.partialPaymentPrice) {
        throw new BadRequestException('Este producto no permite el pago de señas.');
      }
      amountToPay = tier.partialPaymentPrice * quantity;
    } else {
      amountToPay = tier.price * quantity;
    }

    const owner = await this.usersService.findOwner();
    if (!owner?.mpAccessToken) {
      throw new InternalServerErrorException("La cuenta del dueño no tiene un Access Token de MP configurado.");
    }

    const promoter = promoterUsername ? await this.usersService.findOneByUsername(promoterUsername) : null;
    if (promoter && !promoter.mpUserId) {
      throw new BadRequestException('El RRPP no tiene su cuenta de Mercado Pago vinculada.');
    }

    const serviceFeeStr = await this.configurationService.get('adminServiceFee');
    const rrppCommissionRateStr = await this.configurationService.get('rrppCommissionRate');
    const adminServiceFee = serviceFeeStr ? parseFloat(serviceFeeStr) : 0;
    const rrppCommissionRate = rrppCommissionRateStr ? parseFloat(rrppCommissionRateStr) : 0;
    const promoterAmount = promoter && rrppCommissionRate > 0 ? (amountToPay * rrppCommissionRate) / 100 : 0;

    const receivers: { id: string; amount: number }[] = [];
    if (promoter && promoter.mpUserId && promoterAmount > 0) {
      receivers.push({
        id: promoter.mpUserId,
        amount: parseFloat(promoterAmount.toFixed(2)),
      });
    }

    const mpClient = new MercadoPagoConfig({ accessToken: owner.mpAccessToken });
    const preferenceClient = new Preference(mpClient);

    const preferenceBody = {
      items: [{
        id: tier.id,
        title: `${tier.name} x ${quantity} - ${tier.event.title} (${paymentType === 'partial' ? 'Seña' : 'Pago Total'})`,
        quantity: 1,
        unit_price: amountToPay,
        currency_id: 'ARS',
      }],
      back_urls: {
        success: `${this.configService.get('FRONTEND_URL')}/payment/success`,
        failure: `${this.configService.get('FRONTEND_URL')}/payment/failure`,
        pending: `${this.configService.get('FRONTEND_URL')}/payment/pending`,
      },
      notification_url: `${this.configService.get('BACKEND_URL')}/payments/webhook`,
      auto_return: 'approved',
      external_reference: JSON.stringify({
        buyerId: buyer.id,
        eventId,
        ticketTierId,
        quantity,
        promoterId: promoter?.id || null,
        promoterUsername: promoter?.username || null,
        amountPaid: amountToPay,
        paymentType,
      }),
      marketplace_fee: adminServiceFee > 0 ? parseFloat(((amountToPay * adminServiceFee) / 100).toFixed(2)) : 0,
    };

    const preference = await preferenceClient.create({ body: preferenceBody });
    return { type: 'paid', preferenceId: preference.id };
  }
  
  public async finalizePurchase(paymentId: string, user: User) {
    this.logger.log(`El usuario ${user.email} solicita finalizar la compra para el pago ${paymentId}`);
    const ticket = await this.processApprovedPayment(paymentId);
    return {
      message: 'Pago verificado y ticket obtenido exitosamente.',
      ticket,
    };
  }

  public async handleWebhook(paymentId: string) {
    await this.processApprovedPayment(paymentId);
  }

  getMercadoPagoAuthUrl(userId: string): string {
    const clientId = this.configService.get('MP_CLIENT_ID');
    const redirectUri = this.configService.get('MP_REDIRECT_URI');
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    return `https://auth.mercadopago.com.ar/authorization?client_id=${clientId}&response_type=code&platform_id=mp&redirect_uri=${redirectUri}&state=${state}`;
  }

  async exchangeCodeForAccessToken(state: string, code: string): Promise<void> {
    let userId: string;
    try {
      const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('ascii'));
      userId = decodedState.userId;
      if (!userId) throw new Error('User ID no encontrado en el state');
    } catch (error) {
      throw new UnauthorizedException('Parámetro de estado inválido o malformado.');
    }

    const clientId = this.configService.get('MP_CLIENT_ID');
    const clientSecret = this.configService.get('MP_CLIENT_SECRET');
    const redirectUri = this.configService.get('MP_REDIRECT_URI');

    try {
      const response = await axios.post('https://api.mercadopago.com/oauth/token', {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      });
      const { access_token, user_id } = response.data;
      await this.usersService.updateMercadoPagoCredentials(userId, access_token, user_id);
    } catch (error) {
      this.logger.error('Error intercambiando el código por el access token:', error.response?.data);
      throw new InternalServerErrorException('Error al vincular la cuenta de Mercado Pago.');
    }
  }
}