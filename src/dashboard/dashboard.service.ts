import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Event } from 'src/events/event.entity';
import { Ticket } from 'src/tickets/ticket.entity';
import { User, UserRole } from 'src/users/user.entity';
import { Repository } from 'typeorm';

// CORRECCIÓN: Exportamos la interfaz para hacerla pública
export interface RRPPPerformanceData {
  rrppId: string;
  rrppName: string;
  ticketsGenerated: number;
  peopleAdmitted: number;
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

  async getRRPPPerformance(): Promise<RRPPPerformanceData[]> {
    const rrpps = await this.usersRepository.createQueryBuilder("user")
      .where("user.roles @> ARRAY[:role]", { role: UserRole.RRPP })
      .getMany();

    const performanceData: RRPPPerformanceData[] = [];

    for (const rrpp of rrpps) {
      const stats = await this.ticketsRepository.createQueryBuilder("ticket")
        .select("SUM(ticket.quantity)", "ticketsGenerated")
        .addSelect("SUM(ticket.redeemedCount)", "peopleAdmitted")
        .where("ticket.promoterId = :promoterId", { promoterId: rrpp.id })
        .getRawOne();
      
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

  async getSummaryMetrics() {
    const totalTicketsGenerated = await this.ticketsRepository
      .createQueryBuilder('ticket')
      .select('SUM(ticket.quantity)', 'total')
      .getRawOne();

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
    const events = await this.eventsRepository.find({
      relations: ['tickets'],
    });

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
