import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { EventsService } from '../events/events.service';
import { TicketTiersService } from '../ticket-tiers/ticket-tiers.service';
import { TicketsService } from '../tickets/tickets.service';
import { MailService } from '../mail/mail.service';
import { ConfigurationService } from '../configuration/configuration.service';
import { CreateOrganizerInvitationDto } from './dto/create-organizer-invitation.dto';
import { Ticket } from '../tickets/ticket.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class OrganizerService {
  private readonly logger = new Logger(OrganizerService.name);

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    private readonly usersService: UsersService,
    private readonly eventsService: EventsService,
    private readonly ticketTiersService: TicketTiersService,
    private readonly ticketsService: TicketsService,
    private readonly mailService: MailService,
    private readonly configurationService: ConfigurationService,
  ) {}

  async createInvitation(organizer: User, dto: CreateOrganizerInvitationDto) {
    this.logger.log(`Organizador ${organizer.email} creando invitación para ${dto.email}`);
    const { email, guestCount, isVipAccess } = dto;

    if (typeof guestCount !== 'number') {
        throw new BadRequestException('El número de invitados es requerido.');
    }

    const fullOrganizer = await this.usersService.findOneById(organizer.id);
    if (!fullOrganizer) { throw new NotFoundException('No se encontraron los datos del Organizador.'); }

    const invitedUser = await this.usersService.findOrCreateByEmail(email);
    const upcomingEvent = await this.eventsService.findNextUpcomingEvent();
    if (!upcomingEvent) { throw new NotFoundException('No hay un evento próximo para la invitación.'); }

    const entryTier = await this.ticketTiersService.findDefaultFreeTierForEvent(upcomingEvent.id);
    if (!entryTier) { throw new NotFoundException('No se encontró un tipo de entrada gratuita para asignar.'); }

    const mainTicket = await this.ticketsService.createTicketInternal(
      invitedUser,
      { eventId: upcomingEvent.id, ticketTierId: entryTier.id, quantity: (guestCount ?? 0) + 1 },
      fullOrganizer, 0, null, 'ORGANIZER_INVITATION', isVipAccess ?? false, 'INGRESO PREFERENCIAL'
    );

    const finalTicket = await this.ticketsService.findOne(mainTicket.id);
    const frontendUrl = await this.configurationService.get('FRONTEND_URL') || 'https://sucht.com.ar';
    let actionUrl = `${frontendUrl}/mi-cuenta`;
    let buttonText = 'VER INVITACIÓN EN MI CUENTA';

    if (invitedUser.invitationToken) {
      actionUrl = `${frontendUrl}/auth/complete-invitation?token=${invitedUser.invitationToken}`;
      buttonText = 'ACTIVAR CUENTA Y VER INVITACIÓN';
    }
    
    const qrBoxStyle = "background-color: white; padding: 15px; border-radius: 8px; margin: 10px auto; max-width: 180px;";
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${finalTicket.id}`;
    
    const mainTicketQrHtml = `
      <div style="margin-bottom: 20px; border: 2px solid; border-image: linear-gradient(90deg, #3b82f6, #ef4444) 1; padding: 20px; background-color: #2a2a2a;">
        <p style="color: #60a5fa; margin:0; font-size: 12px; text-transform: uppercase;">Invitación de ${fullOrganizer.name}</p>
        <h3 style="color: #ffffff; margin: 5px 0 15px 0; font-size: 22px;">QR de Ingreso</h3>
        <div style="${qrBoxStyle}"><img src="${qrApiUrl}" alt="QR de Ingreso" /></div>
        <p style="color: #bbbbbb; margin-top: 15px; font-size: 16px;">Válido para ${finalTicket.quantity} personas</p>
        ${finalTicket.isVipAccess ? `<p style="color: #3b82f6; font-weight: bold; margin-top: 10px;">ACCESO VIP</p>` : ''}
        <p style="color: #60a5fa; font-weight: bold; margin-top: 5px;">${finalTicket.specialInstructions}</p>
      </div>
    `;

    const emailHtml = `
        <div style="background-color: #121212; color: #ffffff; font-family: Arial, sans-serif; padding: 40px; text-align: center;">
            <div style="max-width: 600px; margin: auto; background-color: #1e1e1e; border-radius: 12px; overflow: hidden; border: 1px solid #333;">
                <div style="padding: 24px; background-color: #000000;">
                    <h1 style="color: #ffffff; font-size: 28px; margin: 0;">SUCHT</h1>
                </div>
                <div style="padding: 30px;">
                    <h2 style="color: #ffffff; font-size: 24px; margin-top: 0;">Hola ${invitedUser.name || invitedUser.email.split('@')[0]},</h2>
                    <p style="color: #bbbbbb; font-size: 16px;">Has recibido una invitación de parte de <strong>${fullOrganizer.name}</strong> para el evento <strong>${upcomingEvent.title}</strong>.</p>
                    ${mainTicketQrHtml}
                    <a href="${actionUrl}" target="_blank" style="display: inline-block; background-color: #D6006D; color: #ffffff; padding: 15px 30px; margin-top: 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">${buttonText}</a>
                </div>
                <div style="padding: 20px; font-size: 12px; color: #777777; background-color: #000000;">
                    <p style="margin: 0;">Nos vemos en la fiesta.</p>
                </div>
            </div>
        </div>
    `;
    
    await this.mailService.sendMail(invitedUser.email, `Una invitación de ${fullOrganizer.name} para SUCHT`, emailHtml);
    
    this.logger.log(`Invitación de organizador para ${email} creada y enviada.`);
    return { message: `Invitación enviada a ${email}.` };
  }

  async getMySentInvitations(organizerId: string) {
    this.logger.log(`Buscando invitaciones enviadas por el Organizador ID: ${organizerId}`);
    
    const invitationTickets = await this.ticketsRepository.find({
      where: {
        promoter: { id: organizerId },
        origin: 'ORGANIZER_INVITATION',
      },
      relations: ['user', 'event'],
      order: { createdAt: 'DESC' },
    });

    return invitationTickets.map(ticket => ({
      invitedUser: {
        name: ticket.user.name,
        email: ticket.user.email
      },
      event: {
        title: ticket.event.title
      },
      ticket: {
        quantity: ticket.quantity,
        redeemedCount: ticket.redeemedCount,
        isVipAccess: ticket.isVipAccess,
        status: ticket.status,
      },
      gifts: {}
    }));
  }
}