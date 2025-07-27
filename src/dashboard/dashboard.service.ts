import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Event } from 'src/events/event.entity';
import { Ticket } from 'src/tickets/ticket.entity';
import { User } from 'src/users/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
  ) {}

  async getSummaryMetrics() {
    // Contar todas las entradas generadas (suma de las cantidades de cada ticket)
    const totalTicketsGenerated = await this.ticketsRepository
      .createQueryBuilder('ticket')
      .select('SUM(ticket.quantity)', 'total')
      .getRawOne();

    // Contar todas las personas que realmente ingresaron (suma de los canjeados)
    const totalPeopleAdmitted = await this.ticketsRepository
      .createQueryBuilder('ticket')
      .select('SUM(ticket.redeemedCount)', 'total')
      .getRawOne();
      
    const totalEvents = await this.eventsRepository.count();

    return {
      totalTicketsGenerated: parseInt(totalTicketsGenerated.total, 10) || 0,
      totalPeopleAdmitted: parseInt(totalPeopleAdmitted.total, 10) || 0,
      totalEvents,
    };
  }

  async getEventPerformance() {
    // Obtenemos todos los eventos con sus tickets relacionados
    const events = await this.eventsRepository.find({
      relations: ['tickets'],
    });

    // Calculamos las estadísticas para cada evento
    const eventPerformance = events.map(event => {
      const ticketsGenerated = event.tickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
      const peopleAdmitted = event.tickets.reduce((sum, ticket) => sum + ticket.redeemedCount, 0);
      return {
        id: event.id,
        title: event.title,
        startDate: event.startDate,
        ticketsGenerated,
        peopleAdmitted,
      };
    });

    return eventPerformance.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }
}