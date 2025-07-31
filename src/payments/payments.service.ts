import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import MercadoPagoConfig, { Preference } from 'mercadopago';
import { TicketsService } from 'src/tickets/tickets.service';
import { UsersService } from 'src/users/users.service';
import { User } from 'src/users/user.entity';
import { TicketTiersService } from 'src/ticket-tiers/ticket-tiers.service';
import { AcquireTicketDto } from 'src/tickets/dto/acquire-ticket.dto';
import { ConfigurationService } from 'src/configuration/configuration.service'; // 1. IMPORTAR

@Injectable()
export class PaymentsService {
  private client: Preference;

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly ticketsService: TicketsService,
    private readonly ticketTiersService: TicketTiersService,
    private readonly configurationService: ConfigurationService, // 2. INYECTAR
  ) {}

  async createPreference(
    buyer: User,
    data: AcquireTicketDto & { promoterUsername?: string },
  ) {
    const { eventId, ticketTierId, quantity, promoterUsername } = data;

    const tier = await this.ticketTiersService.findOne(ticketTierId);
    if (!tier) throw new NotFoundException('Tipo de entrada no encontrado.');
    if (tier.quantity < quantity) throw new BadRequestException('No quedan suficientes entradas.');
    
    // --- LÓGICA ACTUALIZADA ---
    // 3. Verificamos si los pagos están habilitados globalmente
    const paymentsEnabled = await this.configurationService.get('paymentsEnabled');

    // Si la entrada es gratis O los pagos están deshabilitados, la generamos directamente
    if (tier.price === 0 || paymentsEnabled !== 'true') {
      const ticket = await this.ticketsService.acquireForClient(buyer, data, promoterUsername);
      return { type: 'free', ticketId: ticket.id, message: 'Entrada generada con éxito.' };
    }
    
    // --- LÓGICA PARA ENTRADAS PAGAS (solo se ejecuta si los pagos están habilitados) ---
    const owner = await this.usersService.findOwner();
    if (!owner?.mercadoPagoAccessToken) {
      throw new Error("La cuenta del dueño no tiene un Access Token de Mercado Pago configurado.");
    }
    const mpClient = new MercadoPagoConfig({ accessToken: owner.mercadoPagoAccessToken });
    this.client = new Preference(mpClient);

    const adminConfig = await this.usersService.getAdminConfig();
    const promoter = promoterUsername ? await this.usersService.findOneByUsername(promoterUsername) : null;
    
    const totalAmount = tier.price * quantity;
    const adminFee = adminConfig.serviceFee > 0 ? (totalAmount * adminConfig.serviceFee) / 100 : 0;
    const promoterFee = promoter && promoter.rrppCommissionRate > 0 ? (totalAmount * promoter.rrppCommissionRate) / 100 : 0;
    const totalFee = adminFee + promoterFee;

    const preference = await this.client.create({
      body: {
        items: [{
          id: tier.id,
          title: `Entrada: ${tier.name} x ${quantity} - ${tier.event.title}`,
          quantity: 1,
          unit_price: totalAmount,
          currency_id: 'ARS',
        }],
        application_fee: totalFee > 0 ? parseFloat(totalFee.toFixed(2)) : undefined,
        back_urls: {
          success: `${this.configService.get('FRONTEND_URL')}/payment/success`,
          failure: `${this.configService.get('FRONTEND_URL')}/payment/failure`,
        },
        auto_return: 'approved',
        external_reference: JSON.stringify({ 
          buyerId: buyer.id, 
          eventId,
          ticketTierId,
          quantity,
          promoterUsername,
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
    return this.ticketsService.acquireForClient(buyer, data, data.promoterUsername);
  }
}
