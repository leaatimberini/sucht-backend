import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Partner, PartnerStatus } from './partner.entity';
import { PartnerView } from './partner-view.entity';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { User, UserRole } from 'src/users/user.entity';
import { MailService } from 'src/mail/mail.service';
import { DataSource } from 'typeorm';

@Injectable()
export class PartnersService {
    constructor(
        @InjectRepository(Partner)
        private partnersRepository: Repository<Partner>,
        private dataSource: DataSource,
        private mailService: MailService,
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

    async findAll(): Promise<Partner[]> {
        return this.partnersRepository.find({
            relations: ['user'],
        });
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
        const partners = await this.findAll();
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
}
