import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Event } from 'src/events/event.entity';
import { Ticket } from 'src/tickets/ticket.entity';
import { User, UserRole } from 'src/users/user.entity';
import { Between, Repository } from 'typeorm';

export interface RRPPPerformanceData {
  rrppId: string;
  rrppName: string;
  ticketsGenerated: number;
  peopleAdmitted: number;
}

// Interfaz para los filtros que recibiremos del frontend
export interface DashboardFilters {
  eventId?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async getRRPPPerformance(filters: DashboardFilters): Promise<RRPPPerformanceData[]> {
    const rrpps = await this.usersRepository.createQueryBuilder("user")
      .where("user.roles @> ARRAY[:role]", { role: UserRole.RRPP })
      .getMany();

    const performanceData: RRPPPerformanceData[] = [];

    for (const rrpp of rrpps) {
      const query = this.ticketsRepository.createQueryBuilder("ticket")
        .select("SUM(ticket.quantity)", "ticketsGenerated")
        .addSelect("SUM(ticket.redeemedCount)", "peopleAdmitted")
        .where("ticket.promoterId = :promoterId", { promoterId: rrpp.id });
      
      // Aplicar filtros
      if (filters.eventId) {
        query.andWhere("ticket.eventId = :eventId", { eventId: filters.eventId });
      }
      if (filters.startDate && filters.endDate) {
        query.andWhere("ticket.createdAt BETWEEN :startDate AND :endDate", { 
          startDate: filters.startDate, 
          endDate: filters.endDate 
        });
      }

      const stats = await query.getRawOne();
      
      performanceData.push({
        rrppId: rrpp.id,
        rrppName: rrpp.name,
        ticketsGenerated: parseInt(stats.ticketsGenerated, 10) || 0,
        peopleAdmitted: parseInt(stats.peopleAdmitted, 10) || 0,
      });
    }
    return performanceData;
  }

  async getMyRRPPStats(promoterId: string) {
    const stats = await this.ticketsRepository.createQueryBuilder("ticket")
      .select("SUM(ticket.quantity)", "ticketsGenerated")
      .addSelect("SUM(ticket.redeemedCount)", "peopleAdmitted")
      .where("ticket.promoterId = :promoterId", { promoterId })
      .getRawOne();
    
    const guestList = await this.ticketsRepository.find({
      where: { promoter: { id: promoterId } },
      relations: ['user', 'event', 'tier'],
      select: {
        id: true,
        status: true,
        redeemedCount: true,
        user: { name: true, email: true },
        event: { title: true },
        tier: { name: true },
      }
    });

    return {
      ticketsGenerated: parseInt(stats.ticketsGenerated, 10) || 0,
      peopleAdmitted: parseInt(stats.peopleAdmitted, 10) || 0,
      guestList,
    };
  }

  async getSummaryMetrics(filters: DashboardFilters) {
    const baseQuery = this.ticketsRepository.createQueryBuilder('ticket');
    
    if (filters.eventId) {
      baseQuery.where("ticket.eventId = :eventId", { eventId: filters.eventId });
    }
    if (filters.startDate && filters.endDate) {
      baseQuery.where("ticket.createdAt BETWEEN :startDate AND :endDate", { 
        startDate: filters.startDate, 
        endDate: filters.endDate 
      });
    }

    const totalTicketsGenerated = await baseQuery.select('SUM(ticket.quantity)', 'total').getRawOne();
    const totalPeopleAdmitted = await baseQuery.select('SUM(ticket.redeemedCount)', 'total').getRawOne();
    
    const totalEvents = await this.eventsRepository.count({
      where: filters.eventId ? { id: filters.eventId } : {}
    });

    return {
      totalTicketsGenerated: parseInt(totalTicketsGenerated.total, 10) || 0,
      totalPeopleAdmitted: parseInt(totalPeopleAdmitted.total, 10) || 0,
      totalEvents,
    };
  }

  async getEventPerformance(filters: DashboardFilters) {
    const query = this.eventsRepository.createQueryBuilder('event')
      .leftJoinAndSelect('event.tickets', 'ticket');

    if (filters.eventId) {
      query.where("event.id = :eventId", { eventId: filters.eventId });
    }
    if (filters.startDate && filters.endDate) {
      query.where("event.startDate BETWEEN :startDate AND :endDate", { 
        startDate: filters.startDate, 
        endDate: filters.endDate 
      });
    }

    const events = await query.getMany();

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
