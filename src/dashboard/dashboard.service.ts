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
            const vipTiers = await this.ticketTiersRepository.find({
                where: { isVip: true }
            });
            const vipTierIds = vipTiers.map(tier => tier.id);

            const query = this.usersRepository.createQueryBuilder('user')
                // --- LÍNEA CORREGIDA ---
                // Volvemos a usar los alias que el frontend espera: rrppId y rrppName
                .select([
                    'user.id as "rrppId"',
                    'user.name as "rrppName"',
                    'user.roles as roles'
                ])
                .where("user.roles && :roles", { roles: promoterRoles });

            query.addSelect(
                (subQuery) => {
                    subQuery
                        .select('COALESCE(SUM(ticket.quantity), 0)', 'ticketsGenerated')
                        .from(Ticket, 'ticket')
                        .where('ticket.promoterId = user.id');
                    
                    if (eventId) subQuery.andWhere('ticket.eventId = :eventId', { eventId });
                    if (startDate && endDate) subQuery.andWhere('ticket.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
                    subQuery.andWhere('ticket.tierId NOT IN (:...vipTierIds)', { vipTierIds });
                    
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
                        
                    if (eventId) subQuery.andWhere('ticket.eventId = :eventId', { eventId });
                    if (startDate && endDate) subQuery.andWhere('ticket.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
                    subQuery.andWhere('ticket.tierId NOT IN (:...vipTierIds)', { vipTierIds });
                        
                    return subQuery;
                },
                'peopleAdmitted',
            );

            query.addSelect(
                (subQuery) => {
                    subQuery
                        .select('COALESCE(SUM(ticket.quantity), 0)', 'vipTicketsGenerated')
                        .from(Ticket, 'ticket')
                        .where('ticket.promoterId = user.id');
                    
                    if (eventId) subQuery.andWhere('ticket.eventId = :eventId', { eventId });
                    if (startDate && endDate) subQuery.andWhere('ticket.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
                    subQuery.andWhere('ticket.tierId IN (:...vipTierIds)', { vipTierIds });
                    
                    return subQuery;
                },
                'vipTicketsGenerated',
            );

            query.addSelect(
                (subQuery) => {
                    subQuery
                        .select('COALESCE(SUM(ticket.redeemedCount), 0)', 'vipPeopleAdmitted')
                        .from(Ticket, 'ticket')
                        .where('ticket.promoterId = user.id');
                    
                    if (eventId) subQuery.andWhere('ticket.eventId = :eventId', { eventId });
                    if (startDate && endDate) subQuery.andWhere('ticket.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
                    subQuery.andWhere('ticket.tierId IN (:...vipTierIds)', { vipTierIds });
                    
                    return subQuery;
                },
                'vipPeopleAdmitted',
            );


            query.groupBy('user.id, user.name, user.roles');
            query.orderBy('user.name', 'ASC');
            
            const results = await query.getRawMany();

            // --- LÍNEA CORREGIDA ---
            // Mapeamos los resultados a las propiedades que el frontend espera
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
        const vipTiers = await this.ticketTiersRepository.find({
            where: { isVip: true }
        });
        const vipTierIds = vipTiers.map(tier => tier.id);

        const stats = await this.ticketsRepository.createQueryBuilder("ticket")
            .select("SUM(ticket.quantity)", "ticketsGenerated")
            .addSelect("SUM(ticket.redeemedCount)", "peopleAdmitted")
            .where("ticket.promoterId = :promoterId", { promoterId })
            .andWhere("ticket.tierId NOT IN (:...vipTierIds)", { vipTierIds })
            .getRawOne();
        
        const vipStats = await this.ticketsRepository.createQueryBuilder("ticket")
            .select("SUM(ticket.quantity)", "vipTicketsGenerated")
            .addSelect("SUM(ticket.redeemedCount)", "vipPeopleAdmitted")
            .where("ticket.promoterId = :promoterId", { promoterId })
            .andWhere("ticket.tierId IN (:...vipTierIds)", { vipTierIds })
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
            vipTicketsGenerated: parseInt(vipStats.vipTicketsGenerated, 10) || 0,
            vipPeopleAdmitted: parseInt(vipStats.vipPeopleAdmitted, 10) || 0,
            guestList,
        };
    }

    async getSummaryMetrics(queryDto: DashboardQueryDto) {
        const { eventId, startDate, endDate } = queryDto;

        const vipTiers = await this.ticketTiersRepository.find({
            where: { isVip: true }
        });
        const vipTierIds = vipTiers.map(tier => tier.id);

        // Sub-consulta para tickets no-VIP
        const generalTicketsQuery = this.ticketsRepository.createQueryBuilder('ticket')
            .select('COALESCE(SUM(ticket.quantity), 0)', 'totalTicketsGenerated')
            .addSelect('COALESCE(SUM(ticket.redeemedCount), 0)', 'totalPeopleAdmitted')
            .where('ticket.tierId NOT IN (:...vipTierIds)', { vipTierIds });

        // Sub-consulta para tickets VIP
        const vipTicketsQuery = this.ticketsRepository.createQueryBuilder('ticket')
            .select('COALESCE(SUM(ticket.quantity), 0)', 'totalVIPTicketsGenerated')
            .addSelect('COALESCE(SUM(ticket.redeemedCount), 0)', 'totalVIPPeopleAdmitted')
            .where('ticket.tierId IN (:...vipTierIds)', { vipTierIds });


        if (eventId) {
            generalTicketsQuery.andWhere("ticket.eventId = :eventId", { eventId });
            vipTicketsQuery.andWhere("ticket.eventId = :eventId", { eventId });
        }
        if (startDate && endDate) {
            generalTicketsQuery.andWhere("ticket.createdAt BETWEEN :startDate AND :endDate", { startDate, endDate });
            vipTicketsQuery.andWhere("ticket.createdAt BETWEEN :startDate AND :endDate", { startDate, endDate });
        }

        const generalStats = await generalTicketsQuery.getRawOne();
        const vipStats = await vipTicketsQuery.getRawOne();
        
        const eventFilterOptions = (startDate && endDate) 
            ? { where: { startDate: Between(new Date(startDate), new Date(endDate)) } } 
            : {};
        const totalEvents = await this.eventsRepository.count(eventFilterOptions);

        return {
            totalTicketsGenerated: parseInt(generalStats.totalTicketsGenerated, 10),
            totalPeopleAdmitted: parseInt(generalStats.totalPeopleAdmitted, 10),
            totalVIPTicketsGenerated: parseInt(vipStats.totalVIPTicketsGenerated, 10),
            totalVIPPeopleAdmitted: parseInt(vipStats.totalVIPPeopleAdmitted, 10),
            totalEvents,
        };
    }

    async getEventPerformance(queryDto: DashboardQueryDto) {
        const { eventId, startDate, endDate } = queryDto;

        const vipTiers = await this.ticketTiersRepository.find({
            where: { isVip: true }
        });
        const vipTierIds = vipTiers.map(tier => tier.id);

        const query = this.eventsRepository.createQueryBuilder('event')
            .leftJoin('event.tickets', 'ticket')
            .select('event.id', 'id')
            .addSelect('event.title', 'title')
            .addSelect('event.startDate', 'startDate')
            .addSelect('COALESCE(SUM(CASE WHEN ticket.tierId NOT IN (:...vipTierIds) THEN ticket.quantity ELSE 0 END), 0)', 'ticketsGenerated')
            .addSelect('COALESCE(SUM(CASE WHEN ticket.tierId NOT IN (:...vipTierIds) THEN ticket.redeemedCount ELSE 0 END), 0)', 'peopleAdmitted')
            .addSelect('COALESCE(SUM(CASE WHEN ticket.tierId IN (:...vipTierIds) THEN ticket.quantity ELSE 0 END), 0)', 'vipTicketsGenerated')
            .addSelect('COALESCE(SUM(CASE WHEN ticket.tierId IN (:...vipTierIds) THEN ticket.redeemedCount ELSE 0 END), 0)', 'vipPeopleAdmitted')
            .setParameter('vipTierIds', vipTierIds);
        
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

        // Contamos el total de usuarios que tienen al menos una asistencia para la paginación
        const totalUsersQuery = await this.usersRepository.query(
            `SELECT COUNT(DISTINCT "userId") FROM (
                SELECT "userId" FROM tickets WHERE "redeemedCount" > 0
            ) as attended_users`
        );
        const total = parseInt(totalUsersQuery[0].count, 10);

        // Obtenemos los datos para la página actual
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