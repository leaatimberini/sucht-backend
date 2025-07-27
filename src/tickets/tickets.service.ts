import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Not, Repository } from 'typeorm'; // <-- 1. IMPORTAR IsNull y LessThan
import { Ticket, TicketStatus } from './ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UsersService } from 'src/users/users.service';
import { EventsService } from 'src/events/events.service';
import { TicketTier } from 'src/ticket-tiers/ticket-tier.entity';
import { AcquireTicketDto } from './dto/acquire-ticket.dto';
import { User } from 'src/users/user.entity';
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

  private async acquire(user: User, data: { eventId: string, ticketTierId: string, quantity: number }): Promise<Ticket> {
    const { eventId, ticketTierId, quantity } = data;
    const event = await this.eventsService.findOne(eventId);
    if (!event) throw new NotFoundException('Evento no encontrado.');
    if (new Date() > new Date(event.endDate)) {
      throw new BadRequestException('Este evento ya ha finalizado.');
    }
    const tier = await this.ticketTiersRepository.findOneBy({ id: ticketTierId });
    if (!tier) throw new NotFoundException('Tipo de entrada no encontrado.');
    if (tier.quantity < quantity) throw new BadRequestException(`No quedan suficientes entradas de este tipo. Disponibles: ${tier.quantity}.`);
    const newTicket = this.ticketsRepository.create({ user, event, tier, quantity });
    tier.quantity -= quantity;
    await this.ticketTiersRepository.save(tier);
    return this.ticketsRepository.save(newTicket);
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
    
    // --- CORRECCIÓN AQUÍ ---
    const unconfirmedTickets = await this.ticketsRepository.find({
      where: {
        confirmedAt: IsNull(), // Usamos IsNull() en lugar de null
        event: {
          confirmationSentAt: Not(IsNull()) && LessThan(oneHourAgo), // Usamos Not(IsNull()) y LessThan
        }
      },
      relations: ['tier', 'event'] // Asegúrate de incluir 'event' en las relaciones
    });

    for (const ticket of unconfirmedTickets) {
      const tier = ticket.tier;
      if (tier) {
        tier.quantity += ticket.quantity;
        await this.ticketTiersRepository.save(tier);
      }
      await this.ticketsRepository.remove(ticket);
      console.log(`Ticket ${ticket.id} cancelado por falta de confirmación.`);
    }
  }

  async createByRRPP(createTicketDto: CreateTicketDto): Promise<Ticket> {
    const { userEmail, eventId, ticketTierId } = createTicketDto;
    const user = await this.usersService.findOrCreateByEmail(userEmail);
    return this.acquire(user, { eventId, ticketTierId, quantity: 1 });
  }
  async acquireForClient(user: User, acquireTicketDto: AcquireTicketDto): Promise<Ticket> { return this.acquire(user, acquireTicketDto); }
  async findTicketsByUser(userId: string): Promise<Ticket[]> { return this.ticketsRepository.find({ where: { user: { id: userId } }, relations: ['event', 'tier'], order: { createdAt: 'DESC' }, }); }
  async findOne(ticketId: string): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({ where: { id: ticketId }, relations: ['user', 'event', 'tier'], });
    if (!ticket) throw new NotFoundException('Entrada no válida o no encontrada.');
    return ticket;
  }
  async redeemTicket(ticketId: string, quantityToRedeem: number) {
    const ticket = await this.ticketsRepository.findOne({ where: { id: ticketId }, relations: ['user', 'event', 'tier'], });
    if (!ticket) throw new NotFoundException('Entrada no válida o no encontrada.');
    if (ticket.tier.validUntil && new Date() > new Date(ticket.tier.validUntil)) { throw new BadRequestException('Esta entrada ha expirado.'); }
    if (ticket.status === TicketStatus.USED) throw new BadRequestException('Esta entrada ya fue completamente utilizada.');
    const remainingEntries = ticket.quantity - ticket.redeemedCount;
    if (quantityToRedeem > remainingEntries) { throw new BadRequestException(`Intento de canje inválido. Quedan ${remainingEntries} ingresos disponibles.`); }
    ticket.redeemedCount += quantityToRedeem;
    const validationTime = new Date();
    ticket.validatedAt = validationTime;
    if (ticket.redeemedCount >= ticket.quantity) { ticket.status = TicketStatus.USED; } else { ticket.status = TicketStatus.PARTIALLY_USED; }
    await this.ticketsRepository.save(ticket);
    return {
      message: `${quantityToRedeem} Ingreso(s) Autorizado(s)`,
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
