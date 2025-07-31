import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Event } from 'src/events/event.entity';
import { Ticket } from 'src/tickets/ticket.entity';
import { User, UserRole } from 'src/users/user.entity';
import { LessThan, Repository } from 'typeorm';

export interface RRPPPerformanceData {
  rrppId: string;
  rrppName: string;
  ticketsGenerated: number;
  peopleAdmitted: number;
}

export interface DashboardFilters {
  eventId?: string;
  startDate?: string;
  endDate?: string;
}

// --- NUEVA INTERFAZ PARA EL RANKING ---
export interface AttendanceRankingData {
  userId: string;
  userName: string;
  userEmail: string;
  totalAttendance: number;
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
    const query = this.usersRepository.createQueryBuilder("user")
      .leftJoin('user.promotedTickets', 'ticket')
      .select('user.id', 'rrppId')
      .addSelect('user.name', 'rrppName')
      .addSelect('COALESCE(SUM(ticket.quantity), 0)', 'ticketsGenerated')
      .addSelect('COALESCE(SUM(ticket.redeemedCount), 0)', 'peopleAdmitted')
      .where("user.roles @> ARRAY[:role]", { role: UserRole.RRPP });

    if (filters.eventId) {
      query.andWhere('ticket.eventId = :eventId', { eventId: filters.eventId });
    }
    if (filters.startDate && filters.endDate) {
      query.andWhere('ticket.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    query.groupBy('user.id, user.name');
    query.orderBy('user.name', 'ASC');

    const results = await query.getRawMany();
    
    return results.map(r => ({
      ...r,
      ticketsGenerated: parseInt(r.ticketsGenerated, 10),
      peopleAdmitted: parseInt(r.peopleAdmitted, 10),
    }));
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
    const query = this.ticketsRepository.createQueryBuilder('ticket')
      .select('COALESCE(SUM(ticket.quantity), 0)', 'totalTicketsGenerated')
      .addSelect('COALESCE(SUM(ticket.redeemedCount), 0)', 'totalPeopleAdmitted');

    let hasWhere = false;
    if (filters.eventId) {
      query.where("ticket.eventId = :eventId", { eventId: filters.eventId });
      hasWhere = true;
    }
    if (filters.startDate && filters.endDate) {
      const condition = "ticket.createdAt BETWEEN :startDate AND :endDate";
      const params = { startDate: filters.startDate, endDate: filters.endDate };
      if (hasWhere) {
        query.andWhere(condition, params);
      } else {
        query.where(condition, params);
      }
    }

    const stats = await query.getRawOne();
    const totalEvents = await this.eventsRepository.count();

    return {
      totalTicketsGenerated: parseInt(stats.totalTicketsGenerated, 10),
      totalPeopleAdmitted: parseInt(stats.totalPeopleAdmitted, 10),
      totalEvents,
    };
  }

  async getEventPerformance(filters: DashboardFilters) {
    const query = this.eventsRepository.createQueryBuilder('event')
      .leftJoin('event.tickets', 'ticket')
      .select('event.id', 'id')
      .addSelect('event.title', 'title')
      .addSelect('event.startDate', 'startDate')
      .addSelect('COALESCE(SUM(ticket.quantity), 0)', 'ticketsGenerated')
      .addSelect('COALESCE(SUM(ticket.redeemedCount), 0)', 'peopleAdmitted');

    let hasWhere = false;
    if (filters.eventId) {
      query.where("event.id = :eventId", { eventId: filters.eventId });
      hasWhere = true;
    }
    if (filters.startDate && filters.endDate) {
      const condition = "event.startDate BETWEEN :startDate AND :endDate";
      const params = { startDate: filters.startDate, endDate: filters.endDate };
      if (hasWhere) {
        query.andWhere(condition, params);
      } else {
        query.where(condition, params);
      }
    }

    query.groupBy('event.id, event.title, event.startDate');
    query.orderBy('event.startDate', 'DESC');
    
    const results = await query.getRawMany();
    
    return results.map(r => ({
      ...r,
      ticketsGenerated: parseInt(r.ticketsGenerated, 10),
      peopleAdmitted: parseInt(r.peopleAdmitted, 10),
    }));
  }

  async getNoShows(): Promise<Ticket[]> {
    const now = new Date();

    const noShows = await this.ticketsRepository.find({
      where: {
        redeemedCount: 0,
        event: {
          endDate: LessThan(now), 
        },
      },
      relations: {
        user: true,
        event: true,
        tier: true,
      },
      select: {
        id: true,
        createdAt: true,
        user: {
          id: true,
          name: true,
          email: true,
        },
        event: {
          id: true,
          title: true,
          endDate: true,
        },
        tier: {
          name: true,
        }
      },
      order: {
        event: {
          endDate: "DESC"
        }
      }
    });

    return noShows;
  }

  // --- NUEVO MÉTODO PARA RANKING DE ASISTENCIA ---
  /**
   * Obtiene un ranking de usuarios basado en el total de asistencias (suma de redeemedCount).
   * @param limit - El número de usuarios a devolver en el ranking (Top N).
   */
  async getAttendanceRanking(limit: number = 25): Promise<AttendanceRankingData[]> {
    const query = this.usersRepository.createQueryBuilder("user")
      .leftJoin("user.tickets", "ticket")
      .select("user.id", "userId")
      .addSelect("user.name", "userName")
      .addSelect("user.email", "userEmail")
      .addSelect("COALESCE(SUM(ticket.redeemedCount), 0)", "totalAttendance")
      // Nos aseguramos de contar solo clientes
      .where("user.roles @> ARRAY[:role]", { role: UserRole.CLIENT })
      .groupBy("user.id, user.name, user.email")
      .orderBy("\"totalAttendance\"", "DESC")
      .limit(limit);

    const results = await query.getRawMany();

    // Convertimos el resultado de la suma a número
    return results.map(r => ({
      ...r,
      totalAttendance: parseInt(r.totalAttendance, 10)
    }));
  }
}