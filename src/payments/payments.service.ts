import { BadRequestException, Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import MercadoPagoConfig, { Preference } from 'mercadopago';
import { TicketsService } from 'src/tickets/tickets.service';
import { UsersService } from 'src/users/users.service';
import { User } from 'src/users/user.entity';
import { TicketTiersService } from 'src/ticket-tiers/ticket-tiers.service';
import { AcquireTicketDto } from 'src/tickets/dto/acquire-ticket.dto';
import { ConfigurationService } from 'src/configuration/configuration.service';

@Injectable()
export class PaymentsService {
  private client: Preference;

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
    // Desestructuramos los datos, incluyendo el nuevo paymentType
    const { eventId, ticketTierId, quantity, promoterUsername, paymentType = 'full' } = data;

    const tier = await this.ticketTiersService.findOne(ticketTierId);
    if (!tier) throw new NotFoundException('Tipo de entrada no encontrado.');
    if (tier.quantity < quantity) throw new BadRequestException('No quedan suficientes entradas.');
    
    const paymentsEnabled = await this.configurationService.get('paymentsEnabled');
    if (tier.price === 0 || paymentsEnabled !== 'true') {
      const ticket = await this.ticketsService.acquireForClient(buyer, data, promoterUsername, 0); // Se paga 0
      return { type: 'free', ticketId: ticket.id, message: 'Producto adquirido con éxito.' };
    }
    
    // --- LÓGICA DE PAGO ACTUALIZADA ---
    let amountToPay: number;
    
    // 1. Determinar el monto a pagar
    if (paymentType === 'partial') {
      if (!tier.allowPartialPayment || !tier.partialPaymentPrice) {
        throw new BadRequestException('Este producto no permite el pago de señas.');
      }
      amountToPay = tier.partialPaymentPrice;
    } else {
      amountToPay = tier.price * quantity;
    }

    // 2. Configurar Mercado Pago
    const owner = await this.usersService.findOwner();
    if (!owner?.mercadoPagoAccessToken) {
      throw new InternalServerErrorException("La cuenta del dueño no tiene un Access Token de MP configurado.");
    }
    const mpClient = new MercadoPagoConfig({ accessToken: owner.mercadoPagoAccessToken });
    this.client = new Preference(mpClient);

    const adminConfig = await this.usersService.getAdminConfig();
    const promoter = promoterUsername ? await this.usersService.findOneByUsername(promoterUsername) : null;
    
    // 3. Las comisiones se calculan sobre el MONTO A PAGAR AHORA
    const adminFee = adminConfig.serviceFee > 0 ? (amountToPay * adminConfig.serviceFee) / 100 : 0;
    const promoterFee = promoter && promoter.rrppCommissionRate > 0 ? (amountToPay * promoter.rrppCommissionRate) / 100 : 0;
    const totalFee = adminFee + promoterFee;

    const preference = await this.client.create({
      body: {
        items: [{
          id: tier.id,
          title: `${tier.name} x ${quantity} - ${tier.event.title} (${paymentType === 'partial' ? 'Seña' : 'Pago Total'})`,
          quantity: 1,
          unit_price: amountToPay,
          currency_id: 'ARS',
        }],
        application_fee: totalFee > 0 ? parseFloat(totalFee.toFixed(2)) : undefined,
        back_urls: {
          success: `${this.configService.get('FRONTEND_URL')}/payment/success`,
          failure: `${this.configService.get('FRONTEND_URL')}/payment/failure`,
        },
        auto_return: 'approved',
        // 4. Guardamos el monto pagado y el tipo en la referencia
        external_reference: JSON.stringify({ 
          buyerId: buyer.id, 
          eventId,
          ticketTierId,
          quantity,
          promoterUsername,
          amountPaid: amountToPay, // Guardamos lo que se está pagando
          paymentType,
        }),
      } as any,
    });

    return { type: 'paid', preferenceId: preference.id };
  }

  async finalizePurchase(externalReference: string) {
    const data = JSON.parse(externalReference);
    const buyer = await this.usersService.findOneById(data.buyerId);
    if (!buyer) {
      throw new NotFoundException('Comprador no encontrado.');
    }
    // 5. Pasamos el monto pagado al servicio de tickets
    return this.ticketsService.acquireForClient(buyer, data, data.promoterUsername, data.amountPaid);
  }
}