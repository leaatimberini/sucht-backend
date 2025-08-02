// backend/src/payments/payments.service.ts

import { BadRequestException, Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { TicketsService } from 'src/tickets/tickets.service';
import { UsersService } from 'src/users/users.service';
import { User } from 'src/users/user.entity';
import { TicketTiersService } from 'src/ticket-tiers/ticket-tiers.service';
import { AcquireTicketDto } from 'src/tickets/dto/acquire-ticket.dto';
import { ConfigurationService } from 'src/configuration/configuration.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly ticketsService: TicketsService,
    private readonly ticketTiersService: TicketTiersService,
    private readonly configurationService: ConfigurationService,
  ) {}

  async createPreference(
    buyer: User,
    data: AcquireTicketDto & { promoterUsername?: string },
  ) {
    const { eventId, ticketTierId, quantity, promoterUsername, paymentType = 'full' } = data;

    const tier = await this.ticketTiersService.findOne(ticketTierId);
    if (!tier) throw new NotFoundException('Tipo de entrada no encontrado.');
    if (tier.quantity < quantity) throw new BadRequestException('No quedan suficientes entradas.');

    const paymentsEnabled = await this.configurationService.get('paymentsEnabled');
    if (tier.price === 0 || paymentsEnabled !== 'true') {
      const ticket = await this.ticketsService.acquireForClient(buyer, data, promoterUsername, 0);
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
    const adminAmount = adminServiceFee > 0 ? (amountToPay * adminServiceFee) / 100 : 0;

    // CORRECCIÓN CRÍTICA: La estructura de split_payments ha sido ajustada
    const receivers: { id: string; amount: number }[] = [];
    if (promoter && promoter.mpUserId) {
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
        amountPaid: amountToPay,
        paymentType,
      }),
      // CORRECCIÓN: Usamos un objeto con la propiedad 'receivers'
      split_payments: receivers.length > 0 ? { receivers } : undefined,
    };

    const preference = await preferenceClient.create({
      body: preferenceBody,
    });

    return { type: 'paid', preferenceId: preference.id };
  }

  async handleWebhook(paymentId: string) {
    const owner = await this.usersService.findOwner();
    if (!owner?.mpAccessToken) {
      throw new InternalServerErrorException("La cuenta del dueño no tiene un Access Token de MP configurado.");
    }
    const mpClient = new MercadoPagoConfig({ accessToken: owner.mpAccessToken });
    const payment = new Payment(mpClient);

    const paymentInfo = await payment.get({ id: paymentId });

    if (paymentInfo.status === 'approved') {
      const externalReference = paymentInfo.external_reference;
      const data = JSON.parse(externalReference as string);
      const buyer = await this.usersService.findOneById(data.buyerId);
      if (!buyer) throw new NotFoundException('Comprador no encontrado.');

      return this.ticketsService.acquireForClient(buyer, data, data.promoterUsername, data.amountPaid);
    }
    return null;
  }
}