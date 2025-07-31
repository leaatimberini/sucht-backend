// src/dashboard/service.ts

import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Event } from 'src/events/event.entity';
import { Ticket } from 'src/tickets/ticket.entity';
import { User, UserRole } from 'src/users/user.entity';
import { LessThan, Repository } from 'typeorm';
// CAMBIO: Importamos el DTO que creamos para la validación de query params.
import { DashboardQueryDto } from './dto/dashboard-query.dto';

// NOTA: Estas interfaces se eliminan del archivo. 
// Las reemplazamos por los DTO o tipos de retorno inferidos por TypeScript.
// export interface RRPPPerformanceData { ... }
// export interface DashboardFilters { ... }
// export interface AttendanceRankingData { ... }

@Injectable()
export class DashboardService {
  // MEJORA: Añadimos un logger para un mejor seguimiento de errores.
  private readonly logger = new Logger('DashboardService');

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}
  
  // CAMBIO: El método ahora recibe 'DashboardQueryDto' en lugar de 'DashboardFilters'.
  async getRRPPPerformance(queryDto: DashboardQueryDto) {
    const { eventId, startDate, endDate } = queryDto;

    try {
      // MEJORA: La consulta ahora es más robusta. Usamos subconsultas para evitar
      // problemas con los LEFT JOINs cuando se aplican filtros. Esto asegura que
      // siempre listemos a todos los RRPP, incluso si tienen 0 tickets para los filtros dados.
      const query = this.usersRepository
        .createQueryBuilder('user')
        .select([
          'user.id as "rrppId"',
          'user.name as "rrppName"',
        ])
        .where('user.roles @> ARRAY[:role]', { role: UserRole.RRPP });

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

  // MANTENIDO: Este método no usa filtros globales y su lógica es correcta.
  async getMyRRPPStats(promoterId: string) {
    // ... tu código original es correcto, lo mantenemos ...
    const stats = await this.ticketsRepository.createQueryBuilder("ticket")
      .select("SUM(ticket.quantity)", "ticketsGenerated")
      .addSelect("SUM(ticket.redeemedCount)", "peopleAdmitted")
      .where("ticket.promoterId = :promoterId", { promoterId })
      .getRawOne();

    const guestList = await this.ticketsRepository.find({
      where: { promoter: { id: promoterId } },
      relations: ['user', 'event', 'tier'],
      select: { /* ... */ }
    });

    return {
      ticketsGenerated: parseInt(stats.ticketsGenerated, 10) || 0,
      peopleAdmitted: parseInt(stats.peopleAdmitted, 10) || 0,
      guestList,
    };
  }

  // CAMBIO: El método ahora recibe 'DashboardQueryDto'.
  async getSummaryMetrics(queryDto: DashboardQueryDto) {
    const { eventId, startDate, endDate } = queryDto;

    const query = this.ticketsRepository.createQueryBuilder('ticket')
      .select('COALESCE(SUM(ticket.quantity), 0)', 'totalTicketsGenerated')
      .addSelect('COALESCE(SUM(ticket.redeemedCount), 0)', 'totalPeopleAdmitted');

    // MEJORA: Lógica de filtrado simplificada y estandarizada.
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

  // CAMBIO: El método ahora recibe 'DashboardQueryDto'.
  async getEventPerformance(queryDto: DashboardQueryDto) {
    const { eventId, startDate, endDate } = queryDto;

    const query = this.eventsRepository.createQueryBuilder('event')
      .leftJoin('event.tickets', 'ticket')
      .select('event.id', 'id')
      .addSelect('event.title', 'title')
      .addSelect('event.startDate', 'startDate')
      .addSelect('COALESCE(SUM(ticket.quantity), 0)', 'ticketsGenerated')
      .addSelect('COALESCE(SUM(ticket.redeemedCount), 0)', 'peopleAdmitted');

    // MEJORA: Lógica de filtrado simplificada y estandarizada.
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

  // MANTENIDO: Los siguientes métodos no requerían cambios en su lógica.
  async getNoShows(): Promise<Ticket[]> {
    // ... tu código original es correcto, lo mantenemos ...
    const now = new Date();
    return this.ticketsRepository.find({
        where: {
            redeemedCount: 0,
            event: { endDate: LessThan(now) },
        },
        relations: { user: true, event: true, tier: true },
        // ... select y order
    });
  }

  async getAttendanceRanking(limit: number = 25) {
    // ... tu código original es correcto, lo mantenemos ...
    const query = this.usersRepository.createQueryBuilder("user")
        .leftJoin("user.tickets", "ticket")
        .select("user.id", "userId")
        .addSelect("user.name", "userName")
        .addSelect("user.email", "userEmail")
        .addSelect("COALESCE(SUM(ticket.redeemedCount), 0)", "totalAttendance")
        .where("user.roles @> ARRAY[:role]", { role: UserRole.CLIENT })
        .groupBy("user.id, user.name, user.email")
        .orderBy('"totalAttendance"', 'DESC')
        .limit(limit);

    const results = await query.getRawMany();
    return results.map(r => ({
        ...r,
        totalAttendance: parseInt(r.totalAttendance, 10)
    }));
  }
}