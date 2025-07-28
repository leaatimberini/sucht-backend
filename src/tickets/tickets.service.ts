import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Not, Repository } from 'typeorm';
import { Ticket, TicketStatus } from './ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UsersService } from 'src/users/users.service';
import { EventsService } from 'src/events/events.service';
import { TicketTier } from 'src/ticket-tiers/ticket-tier.entity';
import { AcquireTicketDto } from './dto/acquire-ticket.dto';
import { User, UserRole } from 'src/users/user.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    @InjectRepository(TicketTier)
    private ticketTiersRepository: Repository<TicketTier>,
    private usersService: UsersService,
    private eventsService: EventsService,
  ) {}

  private async acquire(
    user: User, 
    data: { eventId: string, ticketTierId: string, quantity: number },
    promoterUsername?: string
  ): Promise<Ticket> {
    const { eventId, ticketTierId, quantity } = data;
    const event = await this.eventsService.findOne(eventId);
    if (!event) throw new NotFoundException('Evento no encontrado.');
    if (new Date() > new Date(event.endDate)) {
      throw new BadRequestException('Este evento ya ha finalizado.');
    }
    const tier = await this.ticketTiersRepository.findOneBy({ id: ticketTierId });
    if (!tier) throw new NotFoundException('Tipo de entrada no encontrado.');
    if (tier.quantity < quantity) throw new BadRequestException(`No quedan suficientes entradas de este tipo. Disponibles: ${tier.quantity}.`);
    
    let promoter: User | null = null;
    if (promoterUsername) {
      promoter = await this.usersService.findOneByUsername(promoterUsername);
    }

    const newTicket = this.ticketsRepository.create({ user, event, tier, quantity, promoter });
    
    tier.quantity -= quantity;
    await this.ticketTiersRepository.save(tier);

    return this.ticketsRepository.save(newTicket);
  }

  async createByRRPP(createTicketDto: CreateTicketDto, promoter: User): Promise<Ticket> {
    const { userEmail, eventId, ticketTierId } = createTicketDto;
    const user = await this.usersService.findOrCreateByEmail(userEmail);
    return this.acquire(user, { eventId, ticketTierId, quantity: 1 }, promoter.username);
  }

  async acquireForClient(user: User, acquireTicketDto: AcquireTicketDto, promoterUsername?: string): Promise<Ticket> {
    return this.acquire(user, acquireTicketDto, promoterUsername);
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

  async confirmAttendance(ticketId: string, userId: string): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({ where: { id: ticketId, user: { id: userId } } });
    if (!ticket) {
      throw new NotFoundException('Entrada no encontrada o no te pertenece.');
    }
    ticket.confirmedAt = new Date();
    return this.ticketsRepository.save(ticket);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleUnconfirmedTickets() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const unconfirmedTickets = await this.ticketsRepository.find({
      where: {
        confirmedAt: IsNull(),
        status: TicketStatus.VALID,
        event: {
          confirmationSentAt: Not(IsNull()) && LessThan(oneHourAgo),
        }
      },
      relations: ['tier', 'event']
    });

    for (const ticket of unconfirmedTickets) {
      const tier = ticket.tier;
      if (tier) {
        tier.quantity += ticket.quantity;
        await this.ticketTiersRepository.save(tier);
      }
      await this.ticketsRepository.remove(ticket);
      console.log(`Ticket ${ticket.id} para el evento ${ticket.event.title} cancelado por falta de confirmación.`);
    }
  }

  async redeemTicket(ticketId: string, quantityToRedeem: number) {
    const ticket = await this.ticketsRepository.findOne({ 
      where: { id: ticketId },
      relations: ['user', 'event', 'tier'],
    });

    if (!ticket) throw new NotFoundException('Entrada no válida o no encontrada.');
    if (ticket.tier.validUntil && new Date() > new Date(ticket.tier.validUntil)) {
      throw new BadRequestException('Esta entrada ha expirado.');
    }
    
    // CORRECCIÓN: Se permite el canje en estado VALID o PARTIALLY_USED
    if (ticket.status !== TicketStatus.VALID && ticket.status !== TicketStatus.PARTIALLY_USED) { 
        throw new BadRequestException(`Esta entrada ya fue utilizada completamente o ha sido invalidada.`);
    }
    
    const remainingEntries = ticket.quantity - ticket.redeemedCount;
    if (quantityToRedeem > remainingEntries) {
      throw new BadRequestException(`Intento de canje inválido. Quedan ${remainingEntries} ingresos disponibles.`);
    }

    const validationTime = new Date();
    
    // CORRECCIÓN: Sumamos la cantidad a canjear a los ya canjeados
    ticket.redeemedCount += quantityToRedeem;
    ticket.validatedAt = validationTime;
    
    // CORRECCIÓN: Se actualiza el estado basado en si se canjearon todas las entradas
    if (ticket.redeemedCount >= ticket.quantity) {
      ticket.status = TicketStatus.USED;
    } else {
      ticket.status = TicketStatus.PARTIALLY_USED;
    }
    
    // La devolución de entradas no utilizadas ya no se hace aquí, sino que el ticket se mantiene parcialmente usado.
    
    await this.ticketsRepository.save(ticket);
    
    const responseMessage = `${quantityToRedeem} Ingreso(s) Autorizado(s).`;

    return {
      message: responseMessage,
      status: ticket.status,
      userName: ticket.user.name,
      userEmail: ticket.user.email,
      eventName: ticket.event.title,
      ticketType: ticket.tier.name,
      redeemed: ticket.redeemedCount,
      total: ticket.quantity,
      validatedAt: validationTime.toLocaleString('es-AR'),
    };
  }
}
