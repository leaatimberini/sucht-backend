import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Event } from 'src/events/event.entity';
import { Ticket, TicketStatus } from 'src/tickets/ticket.entity';
import { User, UserRole } from 'src/users/user.entity';
import { Between, In, LessThan, Repository } from 'typeorm';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger('DashboardService');

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}
  
  async getRRPPPerformance(queryDto: DashboardQueryDto) {
    const { eventId, startDate, endDate } = queryDto;

    try {
      const query = this.usersRepository
        .createQueryBuilder('user')
        .select([
          'user.id as "rrppId"',
          'user.name as "rrppName"',
        ])
        // CORRECCIÓN: Se cambia el operador @> por LIKE para buscar en el string
        .where("user.roles LIKE :role", { role: `%${UserRole.RRPP}%` });

      query.addSelect(
        (subQuery) => {
          subQuery
            .select('COALESCE(SUM(ticket.quantity), 0)', 'ticketsGenerated')
            .from(Ticket, 'ticket')
            .where('ticket.promoterId = user.id');
          
          if (eventId) {
            subQuery.andWhere('ticket.eventId = :eventId', { eventId });
          }
          if (startDate && endDate) {
            subQuery.andWhere('ticket.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
          }
          
          return subQuery;
        },
        'ticketsGenerated',
      );
      
      query.addSelect(
        (subQuery) => {
          subQuery
            .select('COALESCE(SUM(ticket.redeemedCount), 0)', 'peopleAdmitted')
            .from(Ticket, 'ticket')
            .where('ticket.promoterId = user.id');
            
          if (eventId) {
            subQuery.andWhere('ticket.eventId = :eventId', { eventId });
          }
          if (startDate && endDate) {
            subQuery.andWhere('ticket.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
          }
            
          return subQuery;
        },
        'peopleAdmitted',
      );

      query.groupBy('user.id, user.name');
      query.orderBy('user.name', 'ASC');
      
      const results = await query.getRawMany();

      return results.map(r => ({
        ...r,
        ticketsGenerated: parseInt(r.ticketsGenerated, 10),
        peopleAdmitted: parseInt(r.peopleAdmitted, 10),
      }));

    } catch (err) {
      this.logger.error(`[getRRPPPerformance] Error: ${err.message}`, err.stack);
      throw new InternalServerErrorException('Error al calcular performance de RRPP');
    }
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

  async getSummaryMetrics(queryDto: DashboardQueryDto) {
    const { eventId, startDate, endDate } = queryDto;

    const query = this.ticketsRepository.createQueryBuilder('ticket')
      .select('COALESCE(SUM(ticket.quantity), 0)', 'totalTicketsGenerated')
      .addSelect('COALESCE(SUM(ticket.redeemedCount), 0)', 'totalPeopleAdmitted');

    if (eventId) {
      query.andWhere("ticket.eventId = :eventId", { eventId });
    }
    if (startDate && endDate) {
      query.andWhere("ticket.createdAt BETWEEN :startDate AND :endDate", { startDate, endDate });
    }

    const stats = await query.getRawOne();
    const totalEvents = await this.eventsRepository.count();

    return {
      totalTicketsGenerated: parseInt(stats.totalTicketsGenerated, 10),
      totalPeopleAdmitted: parseInt(stats.totalPeopleAdmitted, 10),
      totalEvents,
    };
  }

  async getEventPerformance(queryDto: DashboardQueryDto) {
    const { eventId, startDate, endDate } = queryDto;

    const query = this.eventsRepository.createQueryBuilder('event')
      .leftJoin('event.tickets', 'ticket')
      .select('event.id', 'id')
      .addSelect('event.title', 'title')
      .addSelect('event.startDate', 'startDate')
      .addSelect('COALESCE(SUM(ticket.quantity), 0)', 'ticketsGenerated')
      .addSelect('COALESCE(SUM(ticket.redeemedCount), 0)', 'peopleAdmitted');

    if (eventId) {
      query.andWhere("event.id = :eventId", { eventId });
    }
    if (startDate && endDate) {
      query.andWhere("event.startDate BETWEEN :startDate AND :endDate", { startDate, endDate });
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
    return this.ticketsRepository.find({
        where: {
            redeemedCount: 0,
            event: { endDate: LessThan(now) },
        },
        relations: { user: true, event: true, tier: true },
        select: {
          id: true,
          createdAt: true,
          user: { id: true, name: true, email: true },
          event: { id: true, title: true, endDate: true },
          tier: { name: true }
        },
        order: {
          event: { endDate: "DESC" }
        }
    });
  }

  async getAttendanceRanking(limit: number = 25) {
    const query = this.usersRepository.createQueryBuilder("user")
        .leftJoin("user.tickets", "ticket")
        .select("user.id", "userId")
        .addSelect("user.name", "userName")
        .addSelect("user.email", "userEmail")
        .addSelect("COALESCE(SUM(ticket.redeemedCount), 0)", "totalAttendance")
        // CORRECCIÓN: Se cambia el operador @> por LIKE para buscar en el string
        .where("user.roles LIKE :role", { role: `%${UserRole.CLIENT}%` })
        .groupBy("user.id, user.name, user.email")
        .orderBy('"totalAttendance"', 'DESC')
        .limit(limit);

    const results = await query.getRawMany();
    return results.map(r => ({
        ...r,
        totalAttendance: parseInt(r.totalAttendance, 10)
    }));
  }

  async getPerfectAttendance(startDate: string, endDate: string): Promise<User[]> {
    this.logger.log(`[getPerfectAttendance] Calculando asistencia perfecta entre ${startDate} y ${endDate}`);

    const dateRange = {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    };

    const totalEvents = await this.eventsRepository.count({
      where: {
        startDate: Between(dateRange.startDate, dateRange.endDate),
      },
    });

    this.logger.debug(`[getPerfectAttendance] Total de eventos en el período: ${totalEvents}`);

    if (totalEvents === 0) {
      return [];
    }

    const attendanceCounts = await this.ticketsRepository
      .createQueryBuilder('ticket')
      .select('ticket.userId', 'userId')
      .addSelect('COUNT(ticket.id)', 'attendanceCount')
      .where('ticket.status IN (:...statuses)', { 
        statuses: [TicketStatus.REDEEMED, TicketStatus.USED, TicketStatus.PARTIALLY_USED] 
      })
      .andWhere('ticket.validatedAt BETWEEN :startDate AND :endDate', dateRange)
      .groupBy('ticket.userId')
      .getRawMany();

    const perfectAttendanceUserIds = attendanceCounts
      .filter(record => record.attendanceCount >= totalEvents)
      .map(record => record.userId);

    this.logger.debug(`[getPerfectAttendance] IDs de usuarios con asistencia perfecta: ${perfectAttendanceUserIds}`);

    if (perfectAttendanceUserIds.length === 0) {
      return [];
    }

    const users = await this.usersRepository.find({
      where: {
        id: In(perfectAttendanceUserIds),
      },
      select: ['id', 'name', 'email'],
    });

    return users;
  }
}
