import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Event } from 'src/events/event.entity';
import { Ticket, TicketStatus } from 'src/tickets/ticket.entity';
import { User, UserRole } from 'src/users/user.entity';
import { Between, In, LessThan, Repository, ArrayContains } from 'typeorm';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { TicketsService } from 'src/tickets/tickets.service';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { TicketTier } from 'src/ticket-tiers/ticket-tier.entity';

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
        @InjectRepository(TicketTier)
        private readonly ticketTiersRepository: Repository<TicketTier>,
        private readonly ticketsService: TicketsService,
    ) {}
    
    async getFullHistory(queryDto: DashboardQueryDto) {
        return this.ticketsService.getFullHistory(queryDto);
    }
    
    async getRRPPPerformance(queryDto: DashboardQueryDto) {
        const { eventId, startDate, endDate } = queryDto;

        try {
            const promoterRoles = [UserRole.RRPP, UserRole.ORGANIZER];

            const query = this.usersRepository.createQueryBuilder('user')
                .leftJoin('user.promotedTickets', 'ticket')
                .leftJoin('ticket.tier', 'tier')
                .select([
                    'user.id as "rrppId"',
                    'user.name as "rrppName"',
                    'user.roles as roles'
                ])
                .addSelect('COALESCE(SUM(CASE WHEN "tier"."isVip" = false THEN "ticket"."quantity" ELSE 0 END), 0)', 'ticketsGenerated')
                .addSelect('COALESCE(SUM(CASE WHEN "tier"."isVip" = false THEN "ticket"."redeemedCount" ELSE 0 END), 0)', 'peopleAdmitted')
                .addSelect('COALESCE(SUM(CASE WHEN "tier"."isVip" = true THEN "ticket"."quantity" ELSE 0 END), 0)', 'vipTicketsGenerated')
                .addSelect('COALESCE(SUM(CASE WHEN "tier"."isVip" = true THEN "ticket"."redeemedCount" ELSE 0 END), 0)', 'vipPeopleAdmitted')
                .where("user.roles && :roles", { roles: promoterRoles });
            
            if (eventId) {
                query.andWhere("ticket.eventId = :eventId", { eventId });
            }
            if (startDate && endDate) {
                query.andWhere("ticket.createdAt BETWEEN :startDate AND :endDate", { startDate, endDate });
            }

            query.groupBy('user.id, user.name, user.roles');
            query.orderBy('user.name', 'ASC');
            
            const results = await query.getRawMany();

            return results.map(r => ({
                rrppId: r.rrppId,
                rrppName: r.rrppName,
                roles: r.roles,
                ticketsGenerated: parseInt(r.ticketsGenerated, 10),
                peopleAdmitted: parseInt(r.peopleAdmitted, 10),
                vipTicketsGenerated: parseInt(r.vipTicketsGenerated, 10),
                vipPeopleAdmitted: parseInt(r.vipPeopleAdmitted, 10),
            }));

        } catch (err) {
            this.logger.error(`[getRRPPPerformance] Error: ${err.message}`, err.stack);
            throw new InternalServerErrorException('Error al calcular performance de Promotores');
        }
    }

    async getMyRRPPStats(promoterId: string) {
        const stats = await this.ticketsRepository.createQueryBuilder("ticket")
            .leftJoinAndSelect('ticket.tier', 'tier')
            .select('COALESCE(SUM(CASE WHEN "tier"."isVip" = false THEN "ticket"."quantity" ELSE 0 END), 0)', 'ticketsGenerated')
            .addSelect('COALESCE(SUM(CASE WHEN "tier"."isVip" = false THEN "ticket"."redeemedCount" ELSE 0 END), 0)', 'peopleAdmitted')
            .addSelect('COALESCE(SUM(CASE WHEN "tier"."isVip" = true THEN "ticket"."quantity" ELSE 0 END), 0)', 'vipTicketsGenerated')
            .addSelect('COALESCE(SUM(CASE WHEN "tier"."isVip" = true THEN "ticket"."redeemedCount" ELSE 0 END), 0)', 'vipPeopleAdmitted')
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
            vipTicketsGenerated: parseInt(stats.vipTicketsGenerated, 10) || 0,
            vipPeopleAdmitted: parseInt(stats.vipPeopleAdmitted, 10) || 0,
            guestList,
        };
    }

    async getSummaryMetrics(queryDto: DashboardQueryDto) {
        const { eventId, startDate, endDate } = queryDto;

        const query = this.ticketsRepository.createQueryBuilder('ticket')
            .leftJoinAndSelect('ticket.tier', 'tier')
            .select('COALESCE(SUM(CASE WHEN "tier"."isVip" = false THEN "ticket"."quantity" ELSE 0 END), 0)', 'totalTicketsGenerated')
            .addSelect('COALESCE(SUM(CASE WHEN "tier"."isVip" = false THEN "ticket"."redeemedCount" ELSE 0 END), 0)', 'totalPeopleAdmitted')
            .addSelect('COALESCE(SUM(CASE WHEN "tier"."isVip" = true THEN "ticket"."quantity" ELSE 0 END), 0)', 'totalVIPTicketsGenerated')
            .addSelect('COALESCE(SUM(CASE WHEN "tier"."isVip" = true THEN "ticket"."redeemedCount" ELSE 0 END), 0)', 'totalVIPPeopleAdmitted');
        
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
            totalVIPTicketsGenerated: parseInt(stats.totalVIPTicketsGenerated, 10),
            totalVIPPeopleAdmitted: parseInt(stats.totalVIPPeopleAdmitted, 10),
            totalEvents,
        };
    }

    async getEventPerformance(queryDto: DashboardQueryDto) {
        const { eventId, startDate, endDate } = queryDto;

        const query = this.eventsRepository.createQueryBuilder('event')
            .leftJoin('event.tickets', 'ticket')
            .leftJoin('ticket.tier', 'tier')
            .select([
                'event.id AS id',
                'event.title AS title',
                'event.startDate AS startDate',
                'COALESCE(SUM(CASE WHEN "tier"."isVip" = false THEN "ticket"."quantity" ELSE 0 END), 0) AS "ticketsGenerated"',
                'COALESCE(SUM(CASE WHEN "tier"."isVip" = false THEN "ticket"."redeemedCount" ELSE 0 END), 0) AS "peopleAdmitted"',
                'COALESCE(SUM(CASE WHEN "tier"."isVip" = true THEN "ticket"."quantity" ELSE 0 END), 0) AS "vipTicketsGenerated"',
                'COALESCE(SUM(CASE WHEN "tier"."isVip" = true THEN "ticket"."redeemedCount" ELSE 0 END), 0) AS "vipPeopleAdmitted"',
            ]);

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
            vipTicketsGenerated: parseInt(r.vipTicketsGenerated, 10),
            vipPeopleAdmitted: parseInt(r.vipPeopleAdmitted, 10),
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

    async getAttendanceRanking(paginationQuery: PaginationQueryDto) {
        const { page, limit } = paginationQuery;
        const skip = (page - 1) * limit;

        const totalUsersQuery = await this.usersRepository.query(
            `SELECT COUNT(DISTINCT "userId") FROM (
                SELECT "userId" FROM tickets WHERE "redeemedCount" > 0
            ) as attended_users`
        );
        const total = parseInt(totalUsersQuery[0].count, 10);

        const data = await this.usersRepository.query(
            `SELECT 
                "user"."id" as "userId", 
                "user"."name" as "userName", 
                "user"."email" as "userEmail",
                COUNT(DISTINCT "ticket"."eventId") as "totalAttendance"
            FROM "users" "user"
            INNER JOIN "tickets" "ticket" ON "ticket"."userId" = "user"."id" AND "ticket"."redeemedCount" > 0
            WHERE $1 = ANY("user"."roles")
            GROUP BY "user"."id"
            ORDER BY "totalAttendance" DESC
            LIMIT $2
            OFFSET $3`,
            [UserRole.CLIENT, limit, skip]
        );
        
        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
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
                statuses: [TicketStatus.REDEEMED, TicketStatus.PARTIALLY_USED] 
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