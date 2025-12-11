import { Injectable, NotFoundException, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Partner, PartnerStatus } from './partner.entity';
import { PartnerView } from './partner-view.entity';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { User, UserRole } from 'src/users/user.entity';
import { MailService } from 'src/mail/mail.service';
import { DataSource } from 'typeorm';

import { TelegramService } from 'src/notifications/telegram.service';

@Injectable()
export class PartnersService implements OnModuleInit {
    constructor(
        @InjectRepository(Partner)
        private partnersRepository: Repository<Partner>,
        private dataSource: DataSource,
        private mailService: MailService,
        @Inject(forwardRef(() => TelegramService))
        private telegramService: TelegramService,
    ) { }

    async create(createPartnerDto: CreatePartnerDto, user: User): Promise<Partner> {
        // Direct creation (e.g. by admin) might default to APPROVED, but 'apply' flow should be PENDING.
        // Let's assume this is the 'apply' method effectively.
        const partner = this.partnersRepository.create({
            ...createPartnerDto,
            user,
            status: PartnerStatus.PENDING,
            isActive: false, // Default inactive until approved
        });
        return this.partnersRepository.save(partner);
    }

    async approve(id: string): Promise<Partner> {
        const partner = await this.findOne(id);
        partner.status = PartnerStatus.APPROVED;
        partner.isActive = true;

        // Update User Role to PARTNER
        // Using query builder or manager to avoid strict circular dependency on UsersService if possible,
        // or just use query runner
        await this.dataSource.transaction(async manager => {
            await manager.save(partner);

            // Add role if not exists
            const user = await manager.findOne(User, { where: { id: partner.userId } });
            if (user && !user.roles.includes(UserRole.PARTNER)) {
                user.roles.push(UserRole.PARTNER);
                await manager.save(user);
            }
        });

        // Fetch user for email (outside transaction scope)
        const user = await this.dataSource.manager.findOne(User, { where: { id: partner.userId } });

        // Send Welcome Email
        if (user) {
            this.mailService.sendPartnerWelcome({ email: user.email, name: partner.name });
        }

        return partner;
    }

    async reject(id: string): Promise<Partner> {
        const partner = await this.findOne(id);
        partner.status = PartnerStatus.REJECTED;
        partner.isActive = false;
        return this.partnersRepository.save(partner);
    }

    async findAll(category?: string): Promise<Partner[]> {
        const query = this.partnersRepository.createQueryBuilder('partner')
            .leftJoinAndSelect('partner.user', 'user')
            .where('partner.status = :status', { status: PartnerStatus.APPROVED })
            .andWhere('partner.isActive = :isActive', { isActive: true });

        if (category) {
            query.andWhere('partner.category = :category', { category });
        }

        return query.getMany();
    }

    async findAllCategories(): Promise<string[]> {
        const result = await this.partnersRepository.createQueryBuilder('partner')
            .select('DISTINCT partner.category', 'category')
            .where('partner.status = :status', { status: PartnerStatus.APPROVED })
            .andWhere('partner.isActive = :isActive', { isActive: true })
            .andWhere('partner.category IS NOT NULL')
            .getRawMany();

        return result.map(r => r.category);
    }

    async findForBanner(): Promise<Partner[]> {
        return this.partnersRepository.createQueryBuilder('partner')
            .select(['partner.id', 'partner.name', 'partner.logoUrl', 'partner.category'])
            .where('partner.status = :status', { status: PartnerStatus.APPROVED })
            .andWhere('partner.isActive = :isActive', { isActive: true })
            .andWhere('partner.logoUrl IS NOT NULL')
            .orderBy('RANDOM()')
            .limit(10)
            .getMany();
    }

    async findOne(id: string): Promise<Partner> {
        const partner = await this.partnersRepository.findOne({ where: { id }, relations: ['user'] });
        if (!partner) {
            throw new NotFoundException(`Partner with ID "${id}" not found`);
        }
        return partner;
    }

    async findOneByUserId(userId: string): Promise<Partner> {
        const partner = await this.partnersRepository.findOne({ where: { userId }, relations: ['user'] });
        // Returns undefined if not found, let controller handle logic if needed
        return partner as Partner;
    }

    async update(id: string, updatePartnerDto: UpdatePartnerDto): Promise<Partner> {
        const partner = await this.findOne(id);
        this.partnersRepository.merge(partner, updatePartnerDto);
        return this.partnersRepository.save(partner);
    }

    async remove(id: string): Promise<void> {
        const partner = await this.findOne(id);

        await this.dataSource.transaction(async manager => {
            // 1. Remove partner role from user
            if (partner.userId) {
                const user = await manager.findOne(User, { where: { id: partner.userId } });
                if (user && user.roles.includes(UserRole.PARTNER)) {
                    user.roles = user.roles.filter(role => role !== UserRole.PARTNER);
                    await manager.save(user);
                }
            }

            // 2. Delete partner
            await manager.delete(Partner, id);
        });
    }

    // --- Analytics ---

    async trackView(partnerId: string, userId: string | null): Promise<void> {
        // Simple tracking. Could be improved with debounce or more sophisticated logic.
        await this.partnersRepository.manager.save(PartnerView, {
            partnerId,
            userId,
        });
    }

    async getStats(partnerId: string) {
        // 1. Total Views
        const totalViews = await this.partnersRepository.manager.count(PartnerView, { where: { partnerId } });

        // 2. Views by Month (Last 6 months)
        // This is a raw query example for Postgres
        const viewsByMonth = await this.partnersRepository.query(`
            SELECT
              TO_CHAR("viewedAt", 'YYYY-MM') as month,
              COUNT(*) as count
            FROM partner_views
            WHERE "partnerId" = $1
            GROUP BY month
            ORDER BY month ASC
            LIMIT 6
        `, [partnerId]);

        // 3. Coupons stats (We need to query Benefits/Redemptions)
        // Ideally we should inject BenefitsService here or use a raw query joining tables.
        // For simplicity let's use a raw query to avoid circular dependency hell or complex injections for now.

        const couponStats = await this.partnersRepository.query(`
            SELECT
              COUNT(r.id) as "totalRedemptions",
              COUNT(CASE WHEN r.status = 'redeemed' THEN 1 END) as "redeemedCount",
              COUNT(CASE WHEN r.status = 'pending' THEN 1 END) as "pendingCount"
            FROM "redemptions" r
            JOIN "benefits" b ON r."benefitId" = b.id
            WHERE b."partnerId" = $1
        `, [partnerId]);

        return {
            totalViews,
            viewsByMonth,
            coupons: couponStats[0] || { totalRedemptions: 0, redeemedCount: 0, pendingCount: 0 }
        };
    }

    // --- Admin ---
    async getAllPartnersWithStats() {
        // Fetch ALL partners (including PENDING/REJECTED) for Admin Dashboard
        const partners = await this.partnersRepository.find({
            relations: ['user'],
            order: { createdAt: 'DESC' }
        });
        // This could be N+1 but for MVP admin panel with few partners it's acceptable.
        // Optimize with a single complex query if partners grow to > 100.
        const stats = await Promise.all(partners.map(async (p) => {
            const s = await this.getStats(p.id);
            return {
                ...p,
                stats: s
            };
        }));
        return stats;
    }

    // --- TELEGRAM LOGIC ---
    async onModuleInit() {
        this.telegramService.registerMessageHandler(async (text, ctx) => {
            if (text === '👥 Partners Pendientes') {
                const pendingPartners = await this.partnersRepository.find({
                    where: { status: PartnerStatus.PENDING },
                    relations: ['user']
                });
                await this.telegramService.sendPendingPartnersList(pendingPartners);
                return true;
            }
            return false;
        });

        this.telegramService.registerActionHandler(async (action, partnerId) => {
            if (action !== 'approve_partner' && action !== 'reject_partner') {
                return false;
            }
            try {
                if (action === 'approve_partner') {
                    await this.approve(partnerId);
                    await this.telegramService.sendNotification(`✅ Partner aprobado: ${partnerId}`);
                } else if (action === 'reject_partner') {
                    await this.reject(partnerId);
                    await this.telegramService.sendNotification(`❌ Partner rechazado: ${partnerId}`);
                }
                return true;
            } catch (error) {
                console.error('Error handling Telegram action for partner:', error);
                await this.telegramService.sendNotification(`⚠️ Error accion partner: ${error.message}`);
                return true;
            }
        });
    }
}
