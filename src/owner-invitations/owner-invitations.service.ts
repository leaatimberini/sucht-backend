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
import { StoreService } from '../store/store.service';
import { ProductPurchase } from '../store/product-purchase.entity';

@Injectable()
export class OwnerInvitationService {
  private readonly logger = new Logger(OwnerInvitationService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly eventsService: EventsService,
    private readonly ticketTiersService: TicketTiersService,
    private readonly ticketsService: TicketsService,
    private readonly storeService: StoreService,
    private readonly mailService: MailService,
    private readonly configurationService: ConfigurationService,
  ) {}

  async createInvitation(owner: User, dto: CreateInvitationDto) {
    this.logger.log(`Dueño ${owner.email} creando invitación para ${dto.email}`);
    const { email, guestCount, isVipAccess, giftedProducts } = dto;

    // 1. Cargamos los datos completos del Dueño para tener su nombre
    const fullOwner = await this.usersService.findOneById(owner.id);
    if (!fullOwner) {
      throw new NotFoundException('No se encontraron los datos del Dueño.');
    }

    const invitedUser = await this.usersService.findOrCreateByEmail(email);
    const upcomingEvent = await this.eventsService.findNextUpcomingEvent();
    if (!upcomingEvent) {
      throw new NotFoundException('No hay un evento próximo para crear la invitación.');
    }
    const entryTier = await this.ticketTiersService.findDefaultFreeTierForEvent(upcomingEvent.id);
    if (!entryTier) {
      throw new NotFoundException('No se encontró un tipo de entrada gratuita para asignar a la invitación.');
    }

    const mainTicket = await this.ticketsService.createTicketInternal(
      invitedUser,
      { eventId: upcomingEvent.id, ticketTierId: entryTier.id, quantity: guestCount + 1 },
      fullOwner, // Asignamos al Dueño como promotor para que su nombre aparezca
      0, null, 'OWNER_INVITATION', isVipAccess, 'INGRESO SIN FILA'
    );

    const giftedPurchases: ProductPurchase[] = [];
    for (const product of giftedProducts) {
      for (let i = 0; i < product.quantity; i++) {
        const purchase = await this.storeService.createFreePurchase(
          invitedUser, product.productId, upcomingEvent.id, 1, 'OWNER_GIFT'
        );
        giftedPurchases.push(purchase);
      }
    }
    this.logger.log(`Se crearon ${giftedPurchases.length} QRs de regalo individuales.`);
    
    const finalTicket = await this.ticketsService.findOne(mainTicket.id);
    const finalVouchers = await Promise.all(giftedPurchases.map(p => this.storeService.findPurchaseById(p.id)));

    const frontendUrl = await this.configurationService.get('FRONTEND_URL') || 'https://sucht.com.ar';
    const qrBoxStyle = "background-color: white; padding: 15px; border-radius: 8px; margin: 10px auto; max-width: 180px;";
    const qrApiUrl = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=";
    
    // --- LÓGICA CORREGIDA PARA EL ENLACE DEL EMAIL ---
    let actionUrl = `${frontendUrl}/mi-cuenta`;
    let buttonText = 'VER INVITACIÓN EN MI CUENTA';

    if (invitedUser.invitationToken) {
      actionUrl = `${frontendUrl}/auth/complete-invitation?token=${invitedUser.invitationToken}`;
      buttonText = 'ACTIVAR CUENTA Y VER INVITACIÓN';
    }
    
    const mainTicketQrHtml = `...`; // (código del QR de ingreso)
    const giftsQrHtml = `...`; // (código de los QRs de regalos)

    const emailHtml = `
      <div style="background-color: #121212; color: #ffffff; font-family: Arial, sans-serif; padding: 40px; text-align: center;">
        <div style="max-width: 600px; margin: auto; background-color: #1e1e1e; border-radius: 12px; overflow: hidden; border: 1px solid #333;">
          <div style="padding: 24px; background-color: #000000;">
            <h1 style="color: #ffffff; font-size: 28px; margin: 0;">SUCHT</h1>
          </div>
          <div style="padding: 30px;">
            <h2 style="color: #ffffff; font-size: 24px; margin-top: 0;">Hola ${invitedUser.name || invitedUser.email.split('@')[0]},</h2>
            <p style="color: #bbbbbb; font-size: 16px;">Has recibido una invitación muy especial de parte de <strong>${fullOwner.name}</strong> para el evento <strong>${upcomingEvent.title}</strong>.</p>
            
            ${mainTicketQrHtml}
            ${giftsQrHtml}
            
            <a href="${actionUrl}" target="_blank" style="display: inline-block; background-color: #D6006D; color: #ffffff; padding: 15px 30px; margin-top: 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">${buttonText}</a>
          </div>
          <div style="padding: 20px; font-size: 12px; color: #777777; background-color: #000000;">
            <p style="margin: 0;">Nos vemos en la fiesta.</p>
          </div>
        </div>
      </div>
    `;
    
    await this.mailService.sendMail(invitedUser.email, `Una invitación especial de ${fullOwner.name} para SUCHT`, emailHtml);
    
    this.logger.log(`Invitación para ${email} creada y email enviado exitosamente.`);
    return { message: `Invitación especial enviada a ${email}.` };
  }
}