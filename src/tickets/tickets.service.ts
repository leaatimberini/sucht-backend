// src/tickets/tickets.service.ts
import { BadRequestException, Injectable, NotFoundException, InternalServerErrorException, Logger, Inject, forwardRef } from '@nestjs/common';
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
import * as QRCode from 'qrcode';
import { RewardsService } from 'src/rewards/rewards.service';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);
  private readonly timeZone = 'America/Argentina/Buenos_Aires';

  constructor(
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    @InjectRepository(TicketTier)
    private ticketTiersRepository: Repository<TicketTier>,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    private eventsService: EventsService,
    private mailService: MailService,
    private pointTransactionsService: PointTransactionsService,
    private configurationService: ConfigurationService,
    private rewardsService: RewardsService, // Inyectar RewardsService
  ) { }

  public async createTicketInternal(
    user: User,
    data: { eventId: string, ticketTierId: string, quantity: number },
    promoter: User | null,
    amountPaid: number,
    paymentId: string | null,
    origin: string | null = null,
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
    let expectedTotal = Number(tier.price) * numericQuantity;

    // Fix: For VIP Tables, the price is per table, not per person (quantity = guests).
    // So distinct logic: expectedTotal is just the tier price (or potentially overridden price).
    if (tier.productType === ProductType.VIP_TABLE) {
      expectedTotal = Number(tier.price);
    }

    if (amountPaid > 0 && amountPaid < expectedTotal && Math.abs(amountPaid - expectedTotal) > 1) { // Tolerance of $1
      status = TicketStatus.PARTIALLY_PAID;
    }

    const newTicket = this.ticketsRepository.create({
      user, event, tier, quantity: numericQuantity, promoter, amountPaid, status, paymentId, origin, specialInstructions,
    });

    if (origin !== 'OWNER_INVITATION') {
      tier.quantity = Number(tier.quantity) - numericQuantity;
      await this.ticketTiersRepository.save(tier);
    }

    const savedTicket = await this.ticketsRepository.save(newTicket);
    this.logger.log(`[createTicketInternal] Ticket ${savedTicket.id} guardado en DB.`);

    // --- REWARD LINKING LOGIC ---
    if (tier.linkedRewardId) {
      // FIX: Loop based on ticket quantity to issue one reward per ticket entry
      for (let i = 0; i < numericQuantity; i++) {
        try {
          await this.rewardsService.assignFreeReward(user, tier.linkedRewardId, 'TICKET_BUNDLE', savedTicket.id);
          this.logger.log(`[createTicketInternal] Reward vinculado ${tier.linkedRewardId} asignado al ticket ${savedTicket.id} (${i + 1}/${numericQuantity})`);
        } catch (error) {
          this.logger.error(`[createTicketInternal] Error asignando reward vinculado: ${error.message}`, error.stack);
          // No fallamos la creacion del ticket si falla el reward, pero logueamos error
        }
      }
    }

    return savedTicket;
  }

  public async createTicketAndSendEmail(
    user: User,
    data: { eventId: string, ticketTierId: string, quantity: number },
    promoter: User | null,
    amountPaid: number,
    paymentId: string | null,
    origin: string | null = null,
    specialInstructions: string | null = null
  ): Promise<Ticket> {

    const savedTicket = await this.createTicketInternal(user, data, promoter, amountPaid, paymentId, origin, specialInstructions);
    const fullTicket = await this.findOne(savedTicket.id);
    const { event, tier, quantity, isVipAccess } = fullTicket;

    // Generar QR Code
    const qrBuffer = await QRCode.toBuffer(savedTicket.id, {
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      width: 250,
      margin: 1
    });

    const frontendUrl = await this.configurationService.get('FRONTEND_URL') || 'https://sucht.com.ar';
    let actionUrl = `${frontendUrl}/mi-cuenta`;
    let buttonText = 'VER EN MI CUENTA';

    if (user.invitationToken) {
      actionUrl = `${frontendUrl}/auth/complete-invitation?token=${user.invitationToken}`;
      buttonText = 'ACTIVAR CUENTA Y VER INVITACIÓN';
    }

    const senderName = promoter?.name || 'SUCHT';
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ticket Confirmation</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #121212; font-family: 'Arial', sans-serif;">
        <div style="background-color: #121212; padding: 40px 10px;">
          <div style="max-width: 500px; margin: auto; background-color: #1a1a1a; border-radius: 16px; overflow: hidden; border: 1px solid #333333; box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);">
            
            <!-- HEADER -->
            <div style="padding: 30px; background-color: #000000; text-align: center; border-bottom: 1px solid #222;">
              <h1 style="color: #ffffff; font-size: 32px; margin: 0; letter-spacing: 2px;">SUCHT</h1>
            </div>

            <div style="padding: 40px 30px;">
              <!-- GREETING -->
              <h2 style="color: #ffffff; font-size: 26px; margin-top: 0; text-align: center; font-weight: 700;">Hola ${user.name || user.email.split('@')[0]},</h2>
              
              <p style="color: #bbbbbb; font-size: 16px; text-align: center; margin-bottom: 30px; line-height: 1.5;">
                ${origin === 'OWNER_INVITATION' ? `Recibiste una invitación exclusiva de <strong>${senderName}</strong>.` : (origin === 'BIRTHDAY' ? '¡Feliz cumpleaños! Aquí tienes tu beneficio especial.' : '¡Tu entrada está confirmada!')}
              </p>
              
              ${specialInstructions ? `
                <div style="padding: 15px; margin: 0 0 30px 0; border: 1px solid #ffd700; background-color: rgba(255, 215, 0, 0.1); color: #ffd700; border-radius: 8px; font-weight: bold; text-transform: uppercase; font-size: 14px; text-align: center; letter-spacing: 1px;">
                  ${specialInstructions}
                </div>
              ` : ''}

              <!-- TICKET CARD -->
              <div style="background-color: #242424; border-radius: 12px; padding: 25px; margin-bottom: 30px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);">
                <h3 style="color: #D6006D; margin: 0 0 20px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Detalles del Evento</h3>
                
                <div style="margin-bottom: 15px;">
                  <span style="color: #ffffff; display: block; font-weight: 700; font-size: 18px;">${event.title}</span>
                  <span style="color: #888888; font-size: 14px;">Evento</span>
                </div>

                <div style="margin-bottom: 15px; border-top: 1px solid #333; padding-top: 15px;">
                  <span style="color: #ffffff; display: block; font-weight: 700; font-size: 16px;">${tier.name} (x${quantity})</span>
                  <span style="color: #888888; font-size: 14px;">Entrada</span>
                </div>

                <div style="margin-bottom: 15px; border-top: 1px solid #333; padding-top: 15px;">
                   <span style="color: #ffffff; display: block; font-weight: 700; font-size: 16px;">
                    ${new Date(event.startDate).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                   </span>
                   <span style="color: #888888; font-size: 14px;">Fecha</span>
                </div>

                ${isVipAccess ? `
                  <div style="margin-top: 15px; border-top: 1px solid #333; padding-top: 15px;">
                     <span style="color: #D6006D; display: block; font-weight: 700; font-size: 16px; text-transform: uppercase;">Acceso VIP</span>
                  </div>
                ` : ''}

                <!-- QR CODE EMBEDDED -->
                <div style="margin-top: 30px; text-align: center; background-color: #ffffff; padding: 15px; border-radius: 8px;">
                  <img src="cid:qrcode" alt="QR Code" style="width: 200px; height: 200px; display: block; margin: 0 auto;" />
                </div>
              </div>
              
              <!-- CTA BUTTON -->
              <div style="text-align: center;">
                <a href="${actionUrl}" target="_blank" style="display: inline-block; background-color: #D6006D; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 14px; letter-spacing: 1px; box-shadow: 0 4px 15px rgba(214, 0, 109, 0.4); text-transform: uppercase;">${buttonText}</a>
              </div>
            </div>

            <!-- FOOTER -->
            <div style="padding: 30px; text-align: center; border-top: 1px solid #222; background-color: #000000;">
              <p style="margin: 0; color: #555555; font-size: 12px; line-height: 1.6;">
                Gracias por elegir SUCHT.<br>
                Este es un correo generado automáticamente, por favor no respondas.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const subject = origin === 'OWNER_INVITATION' ? `¡${senderName} te ha invitado a SUCHT!` : (origin === 'BIRTHDAY' ? '🎁 ¡Tu regalo de cumpleaños de SUCHT!' : '🎟️ Confirmación de entrada - SUCHT');

    await this.mailService.sendMail(user.email, subject, emailHtml, [
      {
        filename: 'qrcode.png',
        content: qrBuffer,
        cid: 'qrcode' // referencia para usar en el HTML img src
      }
    ]);

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

  async acquireForClient(user: User, acquireTicketDto: AcquireTicketDto, promoterUsername: string | null, amountPaid: number, paymentId: string | null): Promise<Ticket> {
    let promoter: User | null = null;
    if (promoterUsername) {
      promoter = await this.usersService.findOneByUsername(promoterUsername);
    }
    return this.createTicketAndSendEmail(user, acquireTicketDto, promoter, amountPaid, paymentId, 'PURCHASE');
  }

  async getFullHistory(filters: DashboardQueryDto): Promise<Ticket[]> {
    const { eventId, startDate, endDate } = filters;
    const queryOptions: any = { relations: ['user', 'event', 'tier', 'promoter'], order: { createdAt: 'DESC' }, where: {}, };
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
    return this.ticketsRepository.find({ where: { user: { id: userId } }, relations: ['event', 'tier', 'promoter', 'userRewards', 'userRewards.reward'], order: { createdAt: 'DESC' }, });
  }

  async findOne(ticketId: string): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({ where: { id: ticketId }, relations: ['user', 'event', 'tier', 'promoter', 'userRewards', 'userRewards.reward'], });
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

  async updateStatus(ticketId: string, status: TicketStatus, validatedAt: Date | null): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOneBy({ id: ticketId });
    if (!ticket) throw new NotFoundException(`Ticket ${ticketId} not found`);

    ticket.status = status;
    if (validatedAt) {
      ticket.validatedAt = validatedAt;
    }
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

    const now = new TZDate(new Date(), this.timeZone);
    const shouldAwardPoints = ticket.redeemedCount === 0;

    if (now > new Date(ticket.event.endDate)) {
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

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleUnconfirmedTickets() {
    this.logger.log('[CronJob] Ejecutando handleUnconfirmedTickets...');
    const now = new TZDate(new Date(), this.timeZone);
    const oneHourAgo = new TZDate(now.getTime() - 60 * 60 * 1000, this.timeZone);

    const unconfirmedTickets = await this.ticketsRepository.find({
      where: {
        confirmedAt: IsNull(),
        status: TicketStatus.VALID,
        event: { confirmationSentAt: Not(IsNull()) && LessThan(oneHourAgo) },
      },
      relations: ['tier', 'event', 'user'],
    });

    if (unconfirmedTickets.length === 0) return;

    this.logger.log(`[CronJob] ${unconfirmedTickets.length} tickets no confirmados encontrados para invalidar.`);

    // Agrupar por Tier para actualizar stocks en lote si es posible, o mantener lógica simple pero segura
    for (const ticket of unconfirmedTickets) {
      // Devolvemos el stock
      if (ticket.tier) {
        await this.ticketTiersRepository.increment({ id: ticket.tier.id }, 'quantity', ticket.quantity);
      }
    }

    // Actualización masiva de estado
    const ticketIds = unconfirmedTickets.map(t => t.id);
    await this.ticketsRepository.update(
      { id: In(ticketIds) },
      { status: TicketStatus.INVALIDATED }
    );

    this.logger.log(`[CronJob] ${ticketIds.length} tickets invalidados masivamente.`);
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