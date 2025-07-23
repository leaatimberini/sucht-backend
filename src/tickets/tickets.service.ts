import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketStatus } from './ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UsersService } from 'src/users/users.service';
import { EventsService } from 'src/events/events.service';
import { TicketTier } from 'src/ticket-tiers/ticket-tier.entity';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    // Inyectamos el repositorio de TicketTier para poder usarlo
    @InjectRepository(TicketTier)
    private ticketTiersRepository: Repository<TicketTier>,
    private usersService: UsersService,
    private eventsService: EventsService,
  ) {}

  async create(createTicketDto: CreateTicketDto): Promise<Ticket> {
    const { userEmail, eventId, ticketTierId } = createTicketDto;
    
    // 1. Buscamos (o creamos) al usuario
    const user = await this.usersService.findOrCreateByEmail(userEmail);

    // 2. Buscamos el evento
    const event = await this.eventsService.findOne(eventId);
    if (!event) throw new NotFoundException('Evento no encontrado.');

    // 3. Buscamos el tipo de entrada y verificamos la cantidad
    const tier = await this.ticketTiersRepository.findOneBy({ id: ticketTierId });
    if (!tier) throw new NotFoundException('Tipo de entrada no encontrado.');
    if (tier.quantity < 1) throw new BadRequestException('No quedan entradas de este tipo.');

    // 4. Creamos la entrada
    const newTicket = this.ticketsRepository.create({ user, event, tier });
    
    // 5. Descontamos la cantidad del tipo de entrada
    tier.quantity -= 1;
    await this.ticketTiersRepository.save(tier);

    return this.ticketsRepository.save(newTicket);
  }
  
  async verifyTicket(ticketId: string) {
    const ticket = await this.ticketsRepository.findOne({ 
      where: { id: ticketId },
      relations: ['user', 'event', 'tier'], // Añadimos 'tier' a las relaciones
    });

    if (!ticket) {
      throw new NotFoundException('Entrada no válida o no encontrada.');
    }

    if (ticket.status === TicketStatus.USED) {
      throw new BadRequestException(`Esta entrada ya fue utilizada el ${ticket.validatedAt?.toLocaleString('es-AR')}.`);
    }
    
    ticket.status = TicketStatus.USED;
    ticket.validatedAt = new Date();
    await this.ticketsRepository.save(ticket);
    
    return {
      message: 'Acceso Autorizado',
      status: ticket.status,
      userName: ticket.user.name,
      userEmail: ticket.user.email,
      eventName: ticket.event.title,
      ticketType: ticket.tier.name, // Devolvemos el tipo de entrada
    };
  }
}