import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketStatus } from './ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UsersService } from 'src/users/users.service';
import { EventsService } from 'src/events/events.service';
import { TicketTier } from 'src/ticket-tiers/ticket-tier.entity';
import { AcquireTicketDto } from './dto/acquire-ticket.dto';
import { User } from 'src/users/user.entity';

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

  // Lógica actualizada para RRPP
  async createByRRPP(createTicketDto: CreateTicketDto): Promise<Ticket> {
    const { userEmail, eventId, ticketTierId } = createTicketDto;
    const user = await this.usersService.findOrCreateByEmail(userEmail);
    // Por defecto, RRPP crea entradas para 1 persona
    return this.acquire(user, { eventId, ticketTierId, quantity: 1 });
  }

  // Nueva función para que un cliente adquiera sus entradas
  async acquireForClient(user: User, acquireTicketDto: AcquireTicketDto): Promise<Ticket> {
    return this.acquire(user, acquireTicketDto);
  }

  // Lógica centralizada de adquisición
  private async acquire(user: User, data: { eventId: string, ticketTierId: string, quantity: number }): Promise<Ticket> {
    const { eventId, ticketTierId, quantity } = data;
    const event = await this.eventsService.findOne(eventId);
    if (!event) throw new NotFoundException('Evento no encontrado.');

    const tier = await this.ticketTiersRepository.findOneBy({ id: ticketTierId });
    if (!tier) throw new NotFoundException('Tipo de entrada no encontrado.');
    if (tier.quantity < quantity) throw new BadRequestException(`No quedan suficientes entradas de este tipo. Disponibles: ${tier.quantity}.`);
    
    // Aquí podrías añadir lógica de pago si el precio es > 0

    const newTicket = this.ticketsRepository.create({ user, event, tier, quantity });
    
    tier.quantity -= quantity;
    await this.ticketTiersRepository.save(tier);

    return this.ticketsRepository.save(newTicket);
  }
  
  async findTicketsByUser(userId: string): Promise<Ticket[]> {
    return this.ticketsRepository.find({
      where: { user: { id: userId } },
      relations: ['event', 'tier'],
      order: { createdAt: 'DESC' },
    });
  }

  // Lógica de verificación/canje actualizada
  async redeemTicket(ticketId: string, quantityToRedeem: number) {
    const ticket = await this.ticketsRepository.findOne({ 
      where: { id: ticketId },
      relations: ['user', 'event', 'tier'],
    });

    if (!ticket) throw new NotFoundException('Entrada no válida o no encontrada.');
    if (ticket.status === TicketStatus.USED) throw new BadRequestException('Esta entrada ya fue completamente utilizada.');
    
    const remainingEntries = ticket.quantity - ticket.redeemedCount;
    if (quantityToRedeem > remainingEntries) {
      throw new BadRequestException(`Intento de canje inválido. Quedan ${remainingEntries} ingresos disponibles.`);
    }

    ticket.redeemedCount += quantityToRedeem;
    ticket.validatedAt = new Date(); // Actualizamos la fecha con el último canje

    if (ticket.redeemedCount === ticket.quantity) {
      ticket.status = TicketStatus.USED;
    } else {
      ticket.status = TicketStatus.PARTIALLY_USED;
    }
    
    await this.ticketsRepository.save(ticket);
    
    return {
      message: `${quantityToRedeem} Ingresos Autorizados`,
      status: ticket.status,
      userName: ticket.user.name,
      eventName: ticket.event.title,
      ticketType: ticket.tier.name,
      redeemed: ticket.redeemedCount,
      total: ticket.quantity,
    };
  }
}