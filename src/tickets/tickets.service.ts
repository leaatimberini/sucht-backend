import { BadRequestException, Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Not, Repository, Between, In, DeleteResult } from 'typeorm';
import { Ticket, TicketStatus } from './ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UsersService } from 'src/users/users.service';
import { EventsService } from 'src/events/events.service';
import { TicketTier, ProductType } from 'src/ticket-tiers/ticket-tier.entity';
import { AcquireTicketDto } from './dto/acquire-ticket.dto';
import { User } from 'src/users/user.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MailService } from 'src/mail/mail.service';
import { DashboardQueryDto } from 'src/dashboard/dto/dashboard-query.dto';
import { PointTransactionsService } from 'src/point-transactions/point-transactions.service';
import { PointTransactionReason } from 'src/point-transactions/point-transaction.entity';
import { ConfigurationService } from 'src/configuration/configuration.service';
import { TZDate } from '@date-fns/tz';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);
  private readonly timeZone = 'America/Argentina/Buenos_Aires';

  constructor(
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    @InjectRepository(TicketTier)
    private ticketTiersRepository: Repository<TicketTier>,
    private usersService: UsersService,
    private eventsService: EventsService,
    private mailService: MailService,
    private pointTransactionsService: PointTransactionsService,
    private configurationService: ConfigurationService,
  ) {}

  public async createTicketInternal(
    user: User, 
    data: { eventId: string, ticketTierId: string, quantity: number },
    promoter: User | null,
    amountPaid: number,
    paymentId: string | null,
    origin: string | null = null,
    isVipAccess: boolean = false,
    specialInstructions: string | null = null
  ): Promise<Ticket> {
    this.logger.log(`[createTicketInternal] Creando ticket para: ${user.email} | Origen: ${origin}`);
    const { eventId, ticketTierId, quantity } = data;
    const event = await this.eventsService.findOne(eventId);
    if (!event) throw new NotFoundException('Evento no encontrado.');
    const tier = await this.ticketTiersRepository.findOneBy({ id: ticketTierId });
    if (!tier) throw new NotFoundException('Tipo de entrada no encontrado.');

    const numericQuantity = Number(quantity);
    if (isNaN(numericQuantity) || numericQuantity <= 0) {
        throw new BadRequestException('La cantidad de entradas no es válida.');
    }
    
    if (origin !== 'OWNER_INVITATION' && tier.quantity < numericQuantity) {
      throw new BadRequestException(`No quedan suficientes. Disponibles: ${tier.quantity}.`);
    }

    let status = TicketStatus.VALID;
    if (amountPaid > 0 && amountPaid < (Number(tier.price) * numericQuantity)) {
      status = TicketStatus.PARTIALLY_PAID;
    }

    const newTicket = this.ticketsRepository.create({ 
      user, event, tier, quantity: numericQuantity, promoter, amountPaid, status, paymentId, origin, isVipAccess, specialInstructions,
    });
    
    if (origin !== 'OWNER_INVITATION') {
      tier.quantity = Number(tier.quantity) - numericQuantity;
      await this.ticketTiersRepository.save(tier);
    }

    const savedTicket = await this.ticketsRepository.save(newTicket);
    this.logger.log(`[createTicketInternal] Ticket ${savedTicket.id} guardado en DB.`);
    return savedTicket;
  }
  
  public async createTicketAndSendEmail(
    user: User, 
    data: { eventId: string, ticketTierId: string, quantity: number },
    promoter: User | null,
    amountPaid: number,
    paymentId: string | null,
    origin: string | null = null,
    isVipAccess: boolean = false,
    specialInstructions: string | null = null
  ): Promise<Ticket> {
    
    const savedTicket = await this.createTicketInternal(user, data, promoter, amountPaid, paymentId, origin, isVipAccess, specialInstructions);

    const fullTicket = await this.findOne(savedTicket.id);
    const { event, tier, quantity } = fullTicket;
    
    const frontendUrl = await this.configurationService.get('FRONTEND_URL') || 'https://sucht.com.ar';
    
    let actionUrl = `${frontendUrl}/mi-cuenta`;
    let buttonText = 'VER EN MI CUENTA';

    if (user.invitationToken) {
      actionUrl = `${frontendUrl}/auth/complete-invitation?token=${user.invitationToken}`;
      buttonText = 'ACTIVAR CUENTA Y VER INVITACIÓN';
    }

    const senderName = promoter?.name || 'SUCHT';
    const emailHtml = `
      <div style="background-color: #121212; color: #ffffff; font-family: Arial, sans-serif; padding: 40px; text-align: center;">
        <div style="max-width: 600px; margin: auto; background-color: #1e1e1e; border-radius: 12px; overflow: hidden; border: 1px solid #333;">
          <div style="padding: 24px; background-color: #000000;">
            <h1 style="color: #ffffff; font-size: 28px; margin: 0;">SUCHT</h1>
          </div>
          <div style="padding: 30px;">
            <h2 style="color: #ffffff; font-size: 24px; margin-top: 0;">Hola ${user.name || user.email.split('@')[0]},</h2>
            <p style="color: #bbbbbb; font-size: 16px;">${origin === 'OWNER_INVITATION' ? `Has recibido una invitación muy especial de parte de <strong>${senderName}</strong>.` : (origin === 'BIRTHDAY' ? '¡Feliz cumpleaños! Aquí tienes tu beneficio.' : '¡Tu entrada está confirmada!')}</p>
            
            ${specialInstructions ? `<div style="padding: 15px; margin: 20px 0; border: 1px solid #ffd700; background-color: #2b2b1a; color: #ffd700; border-radius: 8px; font-weight: bold; text-transform: uppercase; font-size: 16px;">${specialInstructions}</div>` : ''}

            <div style="background-color: #2a2a2a; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: left;">
              <h3 style="color: #D6006D; margin-top: 0; border-bottom: 1px solid #444; padding-bottom: 10px;">Detalles del Evento</h3>
              <p style="margin: 10px 0;"><strong style="color: #ffffff;">Evento:</strong> ${event.title}</p>
              <p style="margin: 10px 0;"><strong style="color: #ffffff;">Entrada:</strong> ${tier.name} (x${quantity})</p>
              ${isVipAccess ? `<p style="margin: 10px 0;"><strong style="color: #ffffff;">Acceso:</strong> <span style="color: #ffd700; font-weight: bold;">VIP</span></p>` : ''}
              <p style="margin: 10px 0;"><strong style="color: #ffffff;">Fecha:</strong> ${new Date(event.startDate).toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            
            <a href="${actionUrl}" target="_blank" style="display: inline-block; background-color: #D6006D; color: #ffffff; padding: 15px 30px; margin-top: 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">${buttonText}</a>
          </div>
          <div style="padding: 20px; font-size: 12px; color: #777777; background-color: #000000;">
            <p style="margin: 0;">Gracias por ser parte de la comunidad SUCHT.</p>
            <p style="margin: 5px 0;">Este es un correo generado automáticamente.</p>
          </div>
        </div>
      </div>
    `;

    const subject = origin === 'OWNER_INVITATION' ? `¡${senderName} te ha invitado a SUCHT!` : '🎟️ ¡Tu entrada para SUCHT está lista!';
    await this.mailService.sendMail(user.email, subject, emailHtml);

    return savedTicket;
  }

  async createByRRPP(createTicketDto: CreateTicketDto, promoter: User): Promise<Ticket[]> {
    const { userEmail, eventId, ticketTierId, quantity = 1 } = createTicketDto;
    const user = await this.usersService.findOrCreateByEmail(userEmail);
    const tickets: Ticket[] = [];
    for (let i = 0; i < quantity; i++) {
      const ticket = await this.createTicketAndSendEmail(user, { eventId, ticketTierId, quantity: 1 }, promoter, 0, null, 'RRPP');
      tickets.push(ticket);
    }
    return tickets;
  }

  async acquireForClient( user: User, acquireTicketDto: AcquireTicketDto, promoterUsername: string | null, amountPaid: number, paymentId: string | null ): Promise<Ticket> {
    let promoter: User | null = null;
    if (promoterUsername) {
      promoter = await this.usersService.findOneByUsername(promoterUsername); 
    }
    return this.createTicketAndSendEmail(user, acquireTicketDto, promoter, amountPaid, paymentId, 'PURCHASE');
  }
  
  async getFullHistory(filters: DashboardQueryDto): Promise<Ticket[]> {
    const { eventId, startDate, endDate } = filters;
    const queryOptions: any = { relations: ['user', 'event', 'tier', 'promoter'], order: { createdAt: 'DESC' }, where: {},};
    if (eventId) queryOptions.where.event = { id: eventId };
    if (startDate && endDate) queryOptions.where.createdAt = Between(new Date(startDate), new Date(endDate));
    return this.ticketsRepository.find(queryOptions);
  }

  async getScanHistory(eventId: string): Promise<Ticket[]> {
    return this.ticketsRepository.find({ where: { event: { id: eventId }, validatedAt: Not(IsNull()) }, relations: ['user', 'tier'], order: { validatedAt: 'DESC' }, take: 50, });
  }

  async getPremiumProducts(eventId: string): Promise<Ticket[]> {
    return this.ticketsRepository.find({ where: { event: { id: eventId }, tier: { productType: In([ProductType.VIP_TABLE, ProductType.VOUCHER]) } }, relations: ['user', 'tier'], order: { createdAt: 'ASC' }, });
  }

  async findTicketsByUser(userId: string): Promise<Ticket[]> {
    return this.ticketsRepository.find({ where: { user: { id: userId } }, relations: ['event', 'tier', 'promoter'], order: { createdAt: 'DESC' }, });
  }

  async findOne(ticketId: string): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({ where: { id: ticketId }, relations: ['user', 'event', 'tier', 'promoter'], });
    if (!ticket) throw new NotFoundException('Entrada no válida o no encontrada.');
    return ticket;
  }

  async findOneByPaymentId(paymentId: string): Promise<Ticket | null> {
    return this.ticketsRepository.findOne({ where: { paymentId } });
  }

  async confirmAttendance(ticketId: string, userId: string): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({ where: { id: ticketId, user: { id: userId } }, relations: ['event'] });
    if (!ticket) { throw new NotFoundException('Entrada no encontrada o no te pertenece.'); }
    ticket.confirmedAt = new Date();
    return this.ticketsRepository.save(ticket);
  }
  
  async deleteTicket(id: string): Promise<boolean> {
    const ticketToDelete = await this.ticketsRepository.findOne({ where: { id }, relations: ['tier'] });
    if (!ticketToDelete) return false;
    
    const tier = ticketToDelete.tier;
    if (tier && ticketToDelete.origin !== 'OWNER_INVITATION') {
      tier.quantity += ticketToDelete.quantity;
      await this.ticketTiersRepository.save(tier);
    }
    
    const result: DeleteResult = await this.ticketsRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
  
  async redeemTicket(id: string, quantityToRedeem: number): Promise<any> {
    const ticket = await this.ticketsRepository.findOne({ where: { id }, relations: ['user', 'event', 'tier', 'promoter'] });
    if (!ticket) { throw new NotFoundException('Ticket not found.'); }
    
    const now = new TZDate(new Date(), this.timeZone); // <-- USAR TZDate
    const shouldAwardPoints = ticket.redeemedCount === 0;

    if (now > new Date(ticket.event.endDate)) { // La fecha del evento ya tiene la zona horaria correcta
        throw new BadRequestException('Event has already finished.');
    }
    const remaining = ticket.quantity - (ticket.redeemedCount || 0);
    if (remaining === 0) { throw new BadRequestException('Ticket has been fully redeemed.'); }
    if (quantityToRedeem > remaining) { throw new BadRequestException(`Only ${remaining} entries remaining on this ticket.`); }
    
    ticket.redeemedCount += quantityToRedeem;
    ticket.status = ticket.redeemedCount >= ticket.quantity ? TicketStatus.REDEEMED : TicketStatus.PARTIALLY_USED;
    ticket.validatedAt = now;
    await this.ticketsRepository.save(ticket);

    if (shouldAwardPoints) {
        try {
            const pointsValue = await this.configurationService.get('points_attendance');
            const pointsForAttendance = pointsValue ? parseInt(pointsValue, 10) : 100;
            if (pointsForAttendance > 0 && ticket.user) {
                await this.pointTransactionsService.createTransaction(
                ticket.user, pointsForAttendance, PointTransactionReason.EVENT_ATTENDANCE,
                `Asistencia al evento: ${ticket.event.title}`, ticket.id,
                );
            }

            if (ticket.promoter) {
                const referralPointsValue = await this.configurationService.get('points_successful_referral');
                const pointsForReferral = referralPointsValue ? parseInt(referralPointsValue, 10) : 50;
                if (pointsForReferral > 0) {
                    await this.pointTransactionsService.createTransaction(
                    ticket.promoter, pointsForReferral, PointTransactionReason.SOCIAL_SHARE,
                    `Referido exitoso: ${ticket.user.name} asistió al evento.`, ticket.id,
                    );
                }
            }
        } catch (error) {
            this.logger.error(`[redeemTicket] Falló la creación de la transacción de puntos para el ticket ${ticket.id}`, error);
        }
    }

    return {
      message: `${quantityToRedeem} Ingreso(s) Autorizado(s).`,
      status: ticket.status,
      userName: ticket.user.name,
      userEmail: ticket.user.email,
      ticketType: ticket.tier.name,
      redeemed: ticket.redeemedCount,
      total: ticket.quantity,
      validatedAt: ticket.validatedAt,
    };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleUnconfirmedTickets() {
    this.logger.log('[CronJob] Ejecutando handleUnconfirmedTickets...');
    const now = new TZDate(new Date(), this.timeZone); // <-- USAR TZDate
    const oneHourAgo = new TZDate(now.getTime() - 60 * 60 * 1000, this.timeZone); // <-- USAR TZDate
    
    const unconfirmedTickets = await this.ticketsRepository.find({
      where: {
        confirmedAt: IsNull(),
        status: TicketStatus.VALID,
        event: { confirmationSentAt: Not(IsNull()) && LessThan(oneHourAgo) },
      },
      relations: ['tier', 'event', 'user'],
    });
    
    if (unconfirmedTickets.length > 0) {
      this.logger.log(`[CronJob] ${unconfirmedTickets.length} tickets no confirmados encontrados para invalidar.`);
    }

    for (const ticket of unconfirmedTickets) {
      const tier = ticket.tier;
      if (tier) {
        tier.quantity += ticket.quantity;
        await this.ticketTiersRepository.save(tier);
      }
      ticket.status = TicketStatus.INVALIDATED;
      await this.ticketsRepository.save(ticket);
      this.logger.log(`[CronJob] ❌ Ticket ${ticket.id} invalidado por falta de confirmación.`);
    }
  }
  
  async findBirthdayTicketForUser(userId: string, eventId: string): Promise<Ticket | null> {
    return this.ticketsRepository.findOne({
      where: {
        user: { id: userId },
        event: { id: eventId },
        origin: 'BIRTHDAY',
      },
      relations: ['event', 'tier'],
    });
  }

  async findTicketsForRaffle(eventId: string, deadline: Date): Promise<Ticket[]> {
    return this.ticketsRepository.find({
      where: {
        event: { id: eventId },
        createdAt: LessThan(deadline),
      },
      relations: ['user', 'tier'],
    });
  }
}