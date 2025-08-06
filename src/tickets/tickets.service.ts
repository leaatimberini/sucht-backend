// backend/src/tickets/tickets.service.ts

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

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    @InjectRepository(TicketTier)
    private ticketTiersRepository: Repository<TicketTier>,
    private usersService: UsersService,
    private eventsService: EventsService,
    private mailService: MailService,
    private pointTransactionsService: PointTransactionsService, // Se inyecta el nuevo servicio
  ) {}

  private async createTicketAndSendEmail(
    user: User, 
    data: { eventId: string, ticketTierId: string, quantity: number },
    promoter: User | null,
    amountPaid: number,
    paymentId: string | null,
  ): Promise<Ticket> {
    this.logger.log(`[createTicket] Creando ticket para: ${user.email} | RRPP: ${promoter ? promoter.username : 'N/A'}`);
    const { eventId, ticketTierId, quantity } = data;
    const event = await this.eventsService.findOne(eventId);
    if (!event) throw new NotFoundException('Evento no encontrado.');
    if (new Date() > new Date(event.endDate)) {
      throw new BadRequestException('Este evento ya ha finalizado.');
    }
    const tier = await this.ticketTiersRepository.findOneBy({ id: ticketTierId });
    if (!tier) throw new NotFoundException('Tipo de entrada no encontrado.');
    if (tier.quantity < quantity) throw new BadRequestException(`No quedan suficientes. Disponibles: ${tier.quantity}.`);
    
    let status = TicketStatus.VALID;
    const totalPrice = tier.price * quantity;
    if (amountPaid > 0 && amountPaid < totalPrice) {
      status = TicketStatus.PARTIALLY_PAID;
    }

    const newTicket = this.ticketsRepository.create({ 
      user, 
      event, 
      tier, 
      quantity, 
      promoter,
      amountPaid,
      status,
      paymentId,
    });
    
    tier.quantity -= quantity;
    await this.ticketTiersRepository.save(tier);

    const savedTicket = await this.ticketsRepository.save(newTicket);
    this.logger.log(`[createTicket] Ticket ${savedTicket.id} guardado en DB con promoterId: ${savedTicket.promoter?.id || 'null'}`);

    await this.mailService.sendMail(user.email, '🎟️ Entrada adquirida con éxito', `...`);

    return savedTicket;
  }

  async createByRRPP(createTicketDto: CreateTicketDto, promoter: User): Promise<Ticket[]> {
    this.logger.log(`[createByRRPP] RRPP ${promoter.email} generando ${createTicketDto.quantity} ticket(s) para ${createTicketDto.userEmail}`);
    const { userEmail, eventId, ticketTierId, quantity = 1 } = createTicketDto;
    const user = await this.usersService.findOrCreateByEmail(userEmail);
    
    const tickets: Ticket[] = [];
    for (let i = 0; i < quantity; i++) {
      const ticket = await this.createTicketAndSendEmail(user, { eventId, ticketTierId, quantity: 1 }, promoter, 0, null);
      tickets.push(ticket);
    }
    
    await this.mailService.sendMail(user.email, `🎟️ Tienes ${quantity} nuevas entradas de RRPP`, `...`);

    return tickets;
  }

  async acquireForClient(
    user: User, 
    acquireTicketDto: AcquireTicketDto, 
    promoterUsername: string | null,
    amountPaid: number,
    paymentId: string | null,
  ): Promise<Ticket> {
    this.logger.log(`[acquireForClient] Adquiriendo ticket para ${user.email} con RRPP username: ${promoterUsername || 'N/A'}`);
    let promoter: User | null = null;
    if (promoterUsername) {
      promoter = await this.usersService.findOneByUsername(promoterUsername); 
      this.logger.log(`[acquireForClient] Búsqueda de RRPP "${promoterUsername}" resultó en: ${promoter ? promoter.email : 'No encontrado'}`);
    }
    return this.createTicketAndSendEmail(user, acquireTicketDto, promoter, amountPaid, paymentId);
  }
  
  async getFullHistory(filters: DashboardQueryDto): Promise<Ticket[]> {
    const { eventId, startDate, endDate } = filters;
    const queryOptions: any = {
      relations: ['user', 'event', 'tier', 'promoter'],
      order: { createdAt: 'DESC' },
      where: {},
    };

    if (eventId) queryOptions.where.event = { id: eventId };
    if (startDate && endDate) queryOptions.where.createdAt = Between(new Date(startDate), new Date(endDate));
    
    return this.ticketsRepository.find(queryOptions);
  }

  async getScanHistory(eventId: string): Promise<Ticket[]> {
    return this.ticketsRepository.find({
      where: { event: { id: eventId }, validatedAt: Not(IsNull()) },
      relations: ['user', 'tier'],
      order: { validatedAt: 'DESC' },
      take: 50,
    });
  }

  async getPremiumProducts(eventId: string): Promise<Ticket[]> {
    return this.ticketsRepository.find({
      where: { event: { id: eventId }, tier: { productType: In([ProductType.VIP_TABLE, ProductType.VOUCHER]) } },
      relations: ['user', 'tier'],
      order: { createdAt: 'ASC' },
    });
  }

  async findTicketsByUser(userId: string): Promise<Ticket[]> {
    return this.ticketsRepository.find({
      where: { user: { id: userId } },
      relations: ['event', 'tier', 'promoter'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(ticketId: string): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({ 
      where: { id: ticketId },
      relations: ['user', 'event', 'tier', 'promoter'],
    });
    if (!ticket) throw new NotFoundException('Entrada no válida o no encontrada.');
    return ticket;
  }

  async findOneByPaymentId(paymentId: string): Promise<Ticket | null> {
    return this.ticketsRepository.findOne({ where: { paymentId } });
  }

  async confirmAttendance(ticketId: string, userId: string): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({ where: { id: ticketId, user: { id: userId } }, relations: ['event'] });
    if (!ticket) {
      throw new NotFoundException('Entrada no encontrada o no te pertenece.');
    }
    ticket.confirmedAt = new Date();
    return this.ticketsRepository.save(ticket);
  }
  
  async deleteTicket(id: string): Promise<boolean> {
    const ticketToDelete = await this.ticketsRepository.findOne({ where: { id }, relations: ['tier'] });
    if (!ticketToDelete) return false;

    const tier = ticketToDelete.tier;
    if (tier) {
      tier.quantity += ticketToDelete.quantity;
      await this.ticketTiersRepository.save(tier);
    }
    
    const result: DeleteResult = await this.ticketsRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
  
  async redeemTicket(id: string, quantityToRedeem: number): Promise<any> {
    this.logger.log(`[redeemTicket] Iniciando canje para ticket ID: ${id} | Cantidad: ${quantityToRedeem}`);
    const ticket = await this.ticketsRepository.findOne({ where: { id }, relations: ['user', 'event', 'tier'] });

    if (!ticket) {
      this.logger.error(`[redeemTicket] FALLO: No se encontró el ticket con ID ${id}.`);
      throw new NotFoundException('Ticket not found.');
    }
    this.logger.log(`[redeemTicket] Ticket encontrado para el evento: ${ticket.event.title}`);
    const shouldAwardPoints = ticket.redeemedCount === 0;

    if (new Date() > new Date(ticket.event.endDate)) {
      this.logger.warn(`[redeemTicket] FALLO: El evento ya finalizó. Fecha actual: ${new Date()}, Fecha fin evento: ${new Date(ticket.event.endDate)}`);
      throw new BadRequestException('Event has already finished.');
    }

    const remaining = ticket.quantity - (ticket.redeemedCount || 0);
    this.logger.log(`[redeemTicket] Ticket válido. Entradas totales: ${ticket.quantity}, Ya canjeadas: ${ticket.redeemedCount}, Restantes: ${remaining}`);

    if (remaining === 0) {
      this.logger.warn(`[redeemTicket] FALLO: El ticket ya fue canjeado por completo.`);
      throw new BadRequestException('Ticket has been fully redeemed.');
    }

    if (quantityToRedeem > remaining) {
      this.logger.warn(`[redeemTicket] FALLO: Se intentan canjear ${quantityToRedeem} pero solo quedan ${remaining}.`);
      throw new BadRequestException(`Only ${remaining} entries remaining on this ticket.`);
    }

    ticket.redeemedCount += quantityToRedeem;
    if (ticket.redeemedCount >= ticket.quantity) {
      ticket.status = TicketStatus.REDEEMED;
    } else {
      ticket.status = TicketStatus.PARTIALLY_USED;
    }
    ticket.validatedAt = new Date();
    
    this.logger.log('[redeemTicket] VALIDACIÓN OK. Guardando nuevos datos en la DB:', { status: ticket.status, redeemedCount: ticket.redeemedCount });
    await this.ticketsRepository.save(ticket);
    this.logger.log(`[redeemTicket] DATOS GUARDADOS EXITOSAMENTE para ticket ${id}.`);

    // ===== LÓGICA PARA OTORGAR PUNTOS POR ASISTENCIA =====
    if (shouldAwardPoints) {
      try {
        const pointsForAttendance = 100; // Futuro: Leer de la tabla de configuración
        await this.pointTransactionsService.createTransaction(
          ticket.user,
          pointsForAttendance,
          PointTransactionReason.EVENT_ATTENDANCE,
          `Asistencia al evento: ${ticket.event.title}`,
          ticket.id,
        );
      } catch (error) {
        // Si falla la transacción de puntos, solo lo registramos pero no detenemos el flujo
        // para no afectar la experiencia de ingreso del cliente.
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
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
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
}