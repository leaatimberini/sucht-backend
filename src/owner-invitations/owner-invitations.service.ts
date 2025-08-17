import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

@Injectable()
export class OwnerInvitationService {
  private readonly logger = new Logger(OwnerInvitationService.name);

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    @InjectRepository(ProductPurchase)
    private readonly productPurchasesRepository: Repository<ProductPurchase>,
    private readonly usersService: UsersService,
    private readonly eventsService: EventsService,
    private readonly ticketTiersService: TicketTiersService,
    private readonly ticketsService: TicketsService,
    private readonly storeService: StoreService,
    private readonly mailService: MailService,
    private readonly configurationService: ConfigurationService,
  ) {}

  async createInvitation(owner: User, dto: CreateInvitationDto) {
    this.logger.log(`Dueño ${owner.email} creando invitación/regalo para ${dto.email}`);
    const { email, guestCount, isVipAccess, giftedProducts } = dto;

    const isGiftingEntry = typeof guestCount === 'number';

    if (!isGiftingEntry && (!giftedProducts || giftedProducts.length === 0)) {
      throw new BadRequestException('Debes incluir una entrada o al menos un producto de regalo.');
    }

    const fullOwner = await this.usersService.findOneById(owner.id);
    if (!fullOwner) { throw new NotFoundException('No se encontraron los datos del Dueño.'); }

    const invitedUser = await this.usersService.findOrCreateByEmail(email);
    const upcomingEvent = await this.eventsService.findNextUpcomingEvent();
    if (!upcomingEvent) { throw new NotFoundException('No hay un evento próximo para la invitación.'); }

    let mainTicket: Ticket | null = null;
    if (isGiftingEntry) {
      const entryTier = await this.ticketTiersService.findDefaultFreeTierForEvent(upcomingEvent.id);
      if (!entryTier) { throw new NotFoundException('No se encontró un tipo de entrada gratuita para asignar.'); }

      mainTicket = await this.ticketsService.createTicketInternal(
        invitedUser,
        { eventId: upcomingEvent.id, ticketTierId: entryTier.id, quantity: (guestCount ?? 0) + 1 },
        fullOwner, 0, null, 'OWNER_INVITATION', isVipAccess ?? false, 'INGRESO SIN FILA'
      );
    }

    const giftedPurchases: ProductPurchase[] = [];
    if (giftedProducts && giftedProducts.length > 0) {
        for (const product of giftedProducts) {
            for (let i = 0; i < product.quantity; i++) {
                const purchase = await this.storeService.createFreePurchase(
                invitedUser, product.productId, upcomingEvent.id, 1, 'OWNER_GIFT'
                );
                giftedPurchases.push(purchase);
            }
        }
        this.logger.log(`Se crearon ${giftedPurchases.length} QRs de regalo individuales.`);
    }
    
    const finalTicket = mainTicket ? await this.ticketsService.findOne(mainTicket.id) : null;
    const finalVouchers = await Promise.all(giftedPurchases.map(p => this.storeService.findPurchaseById(p.id)));

    const frontendUrl = await this.configurationService.get('FRONTEND_URL') || 'https://sucht.com.ar';
    let actionUrl = `${frontendUrl}/mi-cuenta`;
    let buttonText = 'VER EN MI CUENTA';

    if (invitedUser.invitationToken) {
      actionUrl = `${frontendUrl}/auth/complete-invitation?token=${invitedUser.invitationToken}`;
      buttonText = 'ACTIVAR CUENTA Y VER INVITACIÓN';
    }
    
    const qrBoxStyle = "background-color: white; padding: 15px; border-radius: 8px; margin: 10px auto; max-width: 180px;";
    const qrApiUrl = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=";
    
    const mainTicketQrHtml = finalTicket ? `
      <div style="margin-bottom: 20px; border: 2px solid #ffd700; border-radius: 12px; padding: 20px; background-color: #2a2a2a;">
        <p style="color: #ffd700; margin:0; font-size: 12px; text-transform: uppercase;">Invitado/a Especial de ${fullOwner.name}</p>
        <h3 style="color: #ffffff; margin: 5px 0 15px 0; font-size: 22px;">QR de Ingreso</h3>
        <div style="${qrBoxStyle}"><img src="${qrApiUrl}${finalTicket.id}" alt="QR de Ingreso" /></div>
        <p style="color: #bbbbbb; margin-top: 15px; font-size: 16px;">Válido para ${finalTicket.quantity} personas</p>
        ${finalTicket.isVipAccess ? `<p style="color: #ffd700; font-weight: bold; margin-top: 10px;">ACCESO VIP</p>` : ''}
        <p style="color: #ffd700; font-weight: bold; margin-top: 5px;">${finalTicket.specialInstructions}</p>
      </div>
    ` : '';

    const giftsQrHtml = finalVouchers.length > 0
      ? `
        <h2 style="color: #ffffff; font-size: 24px; margin-top: 40px;">Tus Regalos</h2>
        ${finalVouchers.map(v => `
          <div style="margin-bottom: 20px; border: 1px solid #D6006D; border-radius: 12px; padding: 20px; background-color: #2a2a2a;">
            <p style="color: #D6006D; margin:0; font-size: 12px; text-transform: uppercase;">Regalo de ${fullOwner.name}</p>
            <h3 style="color: #ffffff; margin: 5px 0 15px 0; font-size: 22px;">${v.product.name}</h3>
            <div style="${qrBoxStyle}"><img src="${qrApiUrl}${v.id}" alt="QR de Regalo" /></div>
            <p style="color: #bbbbbb; margin-top: 15px; font-size: 14px;">Presenta este QR en la barra para canjear.</p>
          </div>
        `).join('')}
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
    return { message: `Regalo/Invitación enviado a ${email}.` };
  }

  async getMySentInvitations(ownerId: string) {
    this.logger.log(`Buscando invitaciones enviadas por el Dueño ID: ${ownerId}`);
    const invitationTickets = await this.ticketsRepository.find({
      where: { promoter: { id: ownerId }, origin: 'OWNER_INVITATION', },
      relations: ['user', 'event', 'tier'],
      order: { createdAt: 'DESC' },
    });

    if (invitationTickets.length === 0) { return []; }

    const invitedUserIds = invitationTickets.map(ticket => ticket.user.id);
    const eventIds = invitationTickets.map(ticket => ticket.event.id);

    const giftedProducts = await this.productPurchasesRepository.find({
      where: { userId: In(invitedUserIds), eventId: In(eventIds), origin: 'OWNER_GIFT', },
      relations: ['product'],
    });

    const consolidatedInvitations = invitationTickets.map(ticket => {
      const giftsForThisInvitation = giftedProducts.filter(
        gift => gift.userId === ticket.user.id && gift.eventId === ticket.event.id
      );
      return {
        invitedUser: ticket.user,
        event: ticket.event,
        ticket: { id: ticket.id, quantity: ticket.quantity, redeemedCount: ticket.redeemedCount, isVipAccess: ticket.isVipAccess, status: ticket.status, },
        gifts: giftsForThisInvitation.reduce((acc, current) => {
            acc[current.product.name] = (acc[current.product.name] || 0) + 1;
            return acc;
        }, {} as Record<string, number>)
      };
    });
    return consolidatedInvitations;
  }
}