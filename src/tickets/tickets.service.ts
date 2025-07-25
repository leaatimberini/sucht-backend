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

  // ... (otros métodos como createByRRPP, acquireForClient, etc. no cambian)
  async createByRRPP(createTicketDto: CreateTicketDto): Promise<Ticket> {
    const { userEmail, eventId, ticketTierId } = createTicketDto;
    const user = await this.usersService.findOrCreateByEmail(userEmail);
    return this.acquire(user, { eventId, ticketTierId, quantity: 1 });
  }
  async acquireForClient(user: User, acquireTicketDto: AcquireTicketDto): Promise<Ticket> {
    return this.acquire(user, acquireTicketDto);
  }
  private async acquire(user: User, data: { eventId: string, ticketTierId: string, quantity: number }): Promise<Ticket> {
    const { eventId, ticketTierId, quantity } = data;
    const event = await this.eventsService.findOne(eventId);
    if (!event) throw new NotFoundException('Evento no encontrado.');
    const tier = await this.ticketTiersRepository.findOneBy({ id: ticketTierId });
    if (!tier) throw new NotFoundException('Tipo de entrada no encontrado.');
    if (tier.quantity < quantity) throw new BadRequestException(`No quedan suficientes entradas de este tipo. Disponibles: ${tier.quantity}.`);
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

  // --- LÓGICA DE VERIFICACIÓN ACTUALIZADA ---
  async redeemTicket(ticketId: string, quantityToRedeem: number) {
    const ticket = await this.ticketsRepository.findOne({ 
      where: { id: ticketId },
      relations: ['user', 'event', 'tier'],
    });

    if (!ticket) throw new NotFoundException('Entrada no válida o no encontrada.');
    
    // 1. Verificación de Vencimiento
    if (ticket.tier.validUntil && new Date() > new Date(ticket.tier.validUntil)) {
      throw new BadRequestException('Esta entrada ha expirado.');
    }

    if (ticket.status === TicketStatus.USED) throw new BadRequestException('Esta entrada ya fue completamente utilizada.');
    
    const remainingEntries = ticket.quantity - ticket.redeemedCount;
    if (quantityToRedeem > remainingEntries) {
      throw new BadRequestException(`Intento de canje inválido. Quedan ${remainingEntries} ingresos disponibles.`);
    }

    ticket.redeemedCount += quantityToRedeem;
    const validationTime = new Date(); // Guardamos la hora actual
    ticket.validatedAt = validationTime;

    if (ticket.redeemedCount >= ticket.quantity) {
      ticket.status = TicketStatus.USED;
    } else {
      ticket.status = TicketStatus.PARTIALLY_USED;
    }
    
    await this.ticketsRepository.save(ticket);
    
    // 2. CORRECCIÓN DEL EMAIL Y AÑADIDO DE HORA
    return {
      message: `${quantityToRedeem} Ingreso(s) Autorizado(s)`,
      status: ticket.status,
      userName: ticket.user.name,
      userEmail: ticket.user.email, // El email ahora se incluirá correctamente
      eventName: ticket.event.title,
      ticketType: ticket.tier.name,
      redeemed: ticket.redeemedCount,
      total: ticket.quantity,
      validatedAt: validationTime.toLocaleString('es-AR'), // Devolvemos la hora formateada
    };
  }
}