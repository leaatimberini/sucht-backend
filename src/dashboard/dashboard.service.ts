// src/dashboard/dashboard.service.ts

import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Event } from 'src/events/event.entity';
import { Ticket, TicketStatus } from 'src/tickets/ticket.entity';
import { User, UserRole } from 'src/users/user.entity';
import { Between, In, LessThan, Repository } from 'typeorm';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { TicketsService } from 'src/tickets/tickets.service';

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
        private readonly ticketsService: TicketsService,
    ) {}
    
    /**
     * NUEVO MÉTODO: Obtiene el historial completo de tickets.
     */
    async getFullHistory(queryDto: DashboardQueryDto) {
        return this.ticketsService.getFullHistory(queryDto);
    }
    
    async getRRPPPerformance(queryDto: DashboardQueryDto) {
        const { eventId, startDate, endDate } = queryDto;

        try {
            const query = this.ticketsRepository.createQueryBuilder('ticket')
                .innerJoin('ticket.promoter', 'promoter')
                .select([
                    'promoter.id as id',
                    'promoter.name as name',
                ])
                .addSelect('COUNT(ticket.id)', 'totalTicketsGenerated')
                .addSelect('SUM(ticket.redeemedCount)', 'totalRedemptions')
                // ✅ CORRECCIÓN FINAL: Se usa el nuevo campo `is_paid` de la tabla `tickets`.
                .addSelect(`SUM(CASE WHEN ticket."is_paid" = TRUE THEN ticket."amountPaid" ELSE 0 END)`, 'totalSales');
                
            // ✅ CORRECCIÓN: Se utiliza el casting `::users_roles_enum[]` para que el operador `@>` funcione correctamente.
            query.where(`promoter.roles @> ARRAY[:rrppRole]::users_roles_enum[]`, { rrppRole: UserRole.RRPP });
            
            if (eventId) {
                query.andWhere('ticket.eventId = :eventId', { eventId });
            }
            if (startDate && endDate) {
                query.andWhere('ticket.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
            }
            
            query.groupBy('promoter.id, promoter.name');
            query.orderBy('promoter.name', 'ASC');

            const results = await query.getRawMany();

            return results.map(r => ({
                ...r,
                totalTicketsGenerated: parseInt(r.totalTicketsGenerated, 10) || 0,
                totalRedemptions: parseInt(r.totalRedemptions, 10) || 0,
                totalSales: parseFloat(r.totalSales) || 0,
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
        
        const eventFilterOptions = (startDate && endDate) 
            ? { where: { startDate: Between(new Date(startDate), new Date(endDate)) } } 
            : {};
        const totalEvents = await this.eventsRepository.count(eventFilterOptions);

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
                id: true, createdAt: true,
                user: { id: true, name: true, email: true },
                event: { id: true, title: true, endDate: true },
                tier: { name: true }
            },
            order: { event: { endDate: "DESC" } }
        });
    }

    async getAttendanceRanking(queryDto: DashboardQueryDto, limit: number = 25) {
        const { startDate, endDate } = queryDto;
        const query = this.usersRepository.createQueryBuilder("user")
            .select(["user.id as userId", "user.name as userName", "user.email as userEmail"])
            .addSelect("COALESCE(SUM(ticket.redeemedCount), 0)", "totalAttendance")
            .leftJoin("user.tickets", "ticket", 
                startDate && endDate 
                ? `ticket.validatedAt BETWEEN '${startDate}' AND '${endDate}' AND ticket.redeemedCount > 0`
                : 'ticket.redeemedCount > 0'
            )
            .where(`user.roles @> ARRAY[:clientRole]::users_roles_enum[]`, { clientRole: UserRole.CLIENT })
            .groupBy("user.id, user.name, user.email")
            .orderBy('"totalAttendance"', 'DESC')
            .limit(limit);

        const results = await query.getRawMany();
        return results.map(r => ({ ...r, totalAttendance: parseInt(r.totalAttendance, 10) }));
    }

    async getPerfectAttendance(startDate: string, endDate: string): Promise<User[]> {
        this.logger.log(`[getPerfectAttendance] Calculando asistencia perfecta entre ${startDate} y ${endDate}`);
        const dateRange = { startDate: new Date(startDate), endDate: new Date(endDate) };

        const totalEvents = await this.eventsRepository.count({
            where: { startDate: Between(dateRange.startDate, dateRange.endDate) },
        });

        this.logger.debug(`[getPerfectAttendance] Total de eventos en el período: ${totalEvents}`);
        if (totalEvents === 0) { return []; }

        const attendanceCounts = await this.ticketsRepository
            .createQueryBuilder('ticket')
            .select('ticket.userId', 'userId')
            .addSelect('COUNT(DISTINCT ticket.eventId)', 'attendanceCount')
            .where('ticket.status IN (:...statuses)', { 
                statuses: [TicketStatus.REDEEMED, TicketStatus.USED, TicketStatus.PARTIALLY_USED] 
            })
            .andWhere('ticket.validatedAt BETWEEN :startDate AND :endDate', dateRange)
            .groupBy('ticket.userId')
            .getRawMany();

        const perfectAttendanceUserIds = attendanceCounts
            .filter(record => parseInt(record.attendanceCount, 10) >= totalEvents)
            .map(record => record.userId);

        this.logger.debug(`[getPerfectAttendance] IDs de usuarios con asistencia perfecta: ${perfectAttendanceUserIds}`);
        if (perfectAttendanceUserIds.length === 0) { return []; }

        const users = await this.usersRepository.find({
            where: { id: In(perfectAttendanceUserIds) },
            select: ['id', 'name', 'email'],
        });

        return users;
    }
}