import { BadRequestException, Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
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

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    @InjectRepository(TicketTier)
    private ticketTiersRepository: Repository<TicketTier>,
    private usersService: UsersService,
    private eventsService: EventsService,
    private mailService: MailService,
  ) {}

  private async createTicketAndSendEmail(
    user: User, 
    data: { eventId: string, ticketTierId: string, quantity: number },
    promoter: User | null,
    amountPaid: number,
    paymentId: string | null,
  ): Promise<Ticket> {
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

    await this.ticketsRepository.save(newTicket);

    await this.mailService.sendMail(user.email, '🎟️ Entrada adquirida con éxito', `...`);

    return newTicket;
  }

  async createByRRPP(createTicketDto: CreateTicketDto, promoter: User): Promise<Ticket[]> {
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
    let promoter: User | null = null;
    if (promoterUsername) {
      // ===========================================================================
      // ===== CORRECCIÓN CLAVE: Buscamos por nombre de usuario, no por email =====
      // ===========================================================================
      promoter = await this.usersService.findOneByUsername(promoterUsername); 
      if (!promoter) {
        // Opcional: Advertimos en consola si un RRPP referido no fue encontrado
        console.warn(`Se intentó registrar una venta con un RRPP inexistente: ${promoterUsername}`);
      }
    }
    const ticket = await this.createTicketAndSendEmail(user, acquireTicketDto, promoter, amountPaid, paymentId);
    return ticket;
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
    const ticket = await this.ticketsRepository.findOne({ where: { id }, relations: ['user', 'event', 'tier'] });
    if (!ticket) throw new NotFoundException('Ticket not found.');
    if (new Date() > new Date(ticket.event.endDate)) throw new BadRequestException('Event has already finished.');
    const remaining = ticket.quantity - (ticket.redeemedCount || 0);
    if (remaining === 0) throw new BadRequestException('Ticket has been fully redeemed.');
    if (quantityToRedeem > remaining) throw new BadRequestException(`Only ${remaining} entries remaining on this ticket.`);

    ticket.redeemedCount += quantityToRedeem;
    if (ticket.redeemedCount >= ticket.quantity) {
      ticket.status = TicketStatus.REDEEMED;
    } else {
      ticket.status = TicketStatus.PARTIALLY_USED;
    }
    ticket.validatedAt = new Date();

    await this.ticketsRepository.save(ticket);

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
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const unconfirmedTickets = await this.ticketsRepository.find({
      where: {
        confirmedAt: IsNull(),
        status: TicketStatus.VALID,
        event: { confirmationSentAt: Not(IsNull()) && LessThan(oneHourAgo) },
      },
      relations: ['tier', 'event', 'user'],
    });

    for (const ticket of unconfirmedTickets) {
      const tier = ticket.tier;
      if (tier) {
        tier.quantity += ticket.quantity;
        await this.ticketTiersRepository.save(tier);
      }
      ticket.status = TicketStatus.INVALIDATED;
      await this.ticketsRepository.save(ticket);
      console.log(`❌ Ticket ${ticket.id} cancelado por falta de confirmación.`);
    }
  }
}