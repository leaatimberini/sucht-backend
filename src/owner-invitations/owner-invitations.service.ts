import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { User } from '../users/user.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { UsersService } from '../users/users.service';
import { EventsService } from '../events/events.service';
import { TicketTiersService } from '../ticket-tiers/ticket-tiers.service';
import { TicketsService } from '../tickets/tickets.service';
import { MailService } from '../mail/mail.service';
import { ConfigurationService } from '../configuration/configuration.service';
import { Ticket } from '../tickets/ticket.entity';

@Injectable()
export class OwnerInvitationService {
  private readonly logger = new Logger(OwnerInvitationService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly eventsService: EventsService,
    private readonly ticketTiersService: TicketTiersService,
    private readonly ticketsService: TicketsService,
    private readonly mailService: MailService,
    private readonly configurationService: ConfigurationService,
  ) {}

  async createInvitation(owner: User, dto: CreateInvitationDto) {
    this.logger.log(`Dueño ${owner.email} creando invitación para ${dto.email}`);
    const { email, guestCount, isVipAccess, giftedProducts } = dto;

    // 1. Buscar o crear al usuario invitado
    const invitedUser = await this.usersService.findOrCreateByEmail(email);

    // 2. Encontrar el próximo evento
    const upcomingEvent = await this.eventsService.findNextUpcomingEvent();
    if (!upcomingEvent) {
      throw new NotFoundException('No hay un evento próximo para crear la invitación.');
    }

    // 3. Crear el ticket de ingreso principal
    const entryTier = await this.ticketTiersService.findDefaultFreeTierForEvent(upcomingEvent.id);
    if (!entryTier) {
      throw new NotFoundException('No se encontró un tipo de entrada gratuita para asignar a la invitación.');
    }

    const mainTicket = await this.ticketsService.createTicketInternal(
      invitedUser,
      {
        eventId: upcomingEvent.id,
        ticketTierId: entryTier.id,
        quantity: guestCount + 1,
      },
      null, 0, null,
      'OWNER_INVITATION',
      isVipAccess,
      'INGRESO SIN FILA'
    );

    // 4. Crear los vouchers de productos regalados
    const giftedVouchers: Ticket[] = [];
    for (const product of giftedProducts) {
      // Verificamos que el tierId del producto regalado exista y sea un voucher
      const tier = await this.ticketTiersService.findOne(product.tierId);
      if (!tier || tier.event.id !== upcomingEvent.id) continue; // Salta si el tier no es válido o no es del evento

      for (let i = 0; i < product.quantity; i++) {
        const voucherTicket = await this.ticketsService.createTicketInternal(
          invitedUser,
          {
            eventId: upcomingEvent.id,
            ticketTierId: product.tierId,
            quantity: 1,
          },
          null, 0, null,
          'OWNER_GIFT',
          false, null
        );
        giftedVouchers.push(voucherTicket);
      }
    }
    this.logger.log(`Se crearon ${giftedVouchers.length} vouchers de regalo.`);

    // 5. Enviar el email consolidado
    const frontendUrl = await this.configurationService.get('FRONTEND_URL') || 'https://sucht.com.ar';
    const giftsHtml = giftedVouchers.length > 0
      ? `
        <h3 style="color: #D6006D; margin-top: 25px; border-bottom: 1px solid #444; padding-bottom: 10px;">Regalos Adicionales</h3>
        <ul style="padding-left: 20px; text-align: left;">
          ${giftedVouchers.map(v => `<li><strong style="color: #ffffff;">${v.tier.name}</strong></li>`).join('')}
        </ul>
        <p style="color: #bbbbbb; font-size: 14px; text-align: left;">Podrás ver los QRs de tus regalos en la sección "Mis Productos" de tu cuenta.</p>
      `
      : '';

    const emailHtml = `
      <div style="background-color: #121212; color: #ffffff; font-family: Arial, sans-serif; padding: 40px; text-align: center;">
        <div style="max-width: 600px; margin: auto; background-color: #1e1e1e; border-radius: 12px; overflow: hidden; border: 1px solid #333;">
          <div style="padding: 24px; background-color: #000000;">
            <h1 style="color: #ffffff; font-size: 28px; margin: 0;">SUCHT</h1>
          </div>
          <div style="padding: 30px;">
            <h2 style="color: #ffffff; font-size: 24px; margin-top: 0;">Hola ${invitedUser.name || invitedUser.email.split('@')[0]},</h2>
            <p style="color: #bbbbbb; font-size: 16px;">Has recibido una invitación muy especial de parte de <strong>${owner.name}</strong>.</p>
            
            <div style="padding: 15px; margin: 20px 0; border: 1px solid #ffd700; background-color: #2b2b1a; color: #ffd700; border-radius: 8px; font-weight: bold; text-transform: uppercase; font-size: 16px;">${mainTicket.specialInstructions}</div>

            <div style="background-color: #2a2a2a; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: left;">
              <h3 style="color: #D6006D; margin-top: 0; border-bottom: 1px solid #444; padding-bottom: 10px;">Tu Invitación</h3>
              <p style="margin: 10px 0;"><strong style="color: #ffffff;">Evento:</strong> ${upcomingEvent.title}</p>
              <p style="margin: 10px 0;"><strong style="color: #ffffff;">Válida para:</strong> ${mainTicket.quantity} personas</p>
              ${mainTicket.isVipAccess ? `<p style="margin: 10px 0;"><strong style="color: #ffffff;">Acceso:</strong> <span style="color: #ffd700; font-weight: bold;">VIP</span></p>` : ''}
            </div>

            ${giftsHtml}
            
            <a href="${frontendUrl}/mi-cuenta" target="_blank" style="display: inline-block; background-color: #D6006D; color: #ffffff; padding: 15px 30px; margin-top: 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">VER INVITACIÓN EN MI CUENTA</a>
          </div>
          <div style="padding: 20px; font-size: 12px; color: #777777; background-color: #000000;">
            <p style="margin: 0;">Nos vemos en la fiesta.</p>
          </div>
        </div>
      </div>
    `;
    
    await this.mailService.sendMail(invitedUser.email, `Una invitación especial de ${owner.name} para SUCHT`, emailHtml);
    
    this.logger.log(`Invitación para ${email} creada y email enviado exitosamente.`);
    return {
      message: `Invitación especial enviada a ${email}.`,
      mainTicket,
      giftedVouchers,
    };
  }
}