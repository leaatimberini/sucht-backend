import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Benefit } from './benefit.entity';
import { Redemption, RedemptionStatus } from './redemption.entity';
import { CreateBenefitDto } from './dto/create-benefit.dto';
import { UpdateBenefitDto } from './dto/update-benefit.dto';
import { User, UserRole } from 'src/users/user.entity';
import { PartnersService } from 'src/partners/partners.service';
import * as crypto from 'crypto';

@Injectable()
export class BenefitsService {
    constructor(
        @InjectRepository(Benefit)
        private benefitsRepository: Repository<Benefit>,
        @InjectRepository(Redemption)
        private redemptionsRepository: Repository<Redemption>,
        private partnersService: PartnersService,
    ) { }

    // --- Partner Management ---

    async create(createBenefitDto: CreateBenefitDto, userId: string): Promise<Benefit> {
        const partner = await this.partnersService.findOneByUserId(userId);
        if (!partner) throw new NotFoundException('Partner profile not found for this user.');

        const benefit = this.benefitsRepository.create({
            ...createBenefitDto,
            partner,
        });
        return this.benefitsRepository.save(benefit);
    }

    async findAllByPartner(userId: string): Promise<Benefit[]> {
        const partner = await this.partnersService.findOneByUserId(userId);
        if (!partner) return [];

        return this.benefitsRepository.find({
            where: { partner: { id: partner.id } },
            order: { createdAt: 'DESC' },
        });
    }

    async findAllByPartnerId(partnerId: string): Promise<Benefit[]> {
        return this.benefitsRepository.find({
            where: { partner: { id: partnerId }, isActive: true }, // Only active benefits for public view
            order: { createdAt: 'DESC' },
        });
    }

    async update(id: string, updateBenefitDto: UpdateBenefitDto, userId: string): Promise<Benefit> {
        const benefit = await this.benefitsRepository.findOne({ where: { id }, relations: ['partner'] });
        if (!benefit) throw new NotFoundException(`Benefit with ID "${id}" not found`);

        // Check ownership
        if (benefit.partner.userId !== userId) {
            throw new BadRequestException('You do not own this benefit.');
        }

        this.benefitsRepository.merge(benefit, updateBenefitDto);
        return this.benefitsRepository.save(benefit);
    }

    async remove(id: string, userId: string): Promise<void> {
        const benefit = await this.benefitsRepository.findOne({ where: { id }, relations: ['partner'] });
        if (!benefit) throw new NotFoundException(`Benefit with ID "${id}" not found`);

        const partner = await this.partnersService.findOneByUserId(userId);
        // Admin/Owner override can be handled by controller RolesGuard, but here we check ownership strictly for partner
        // If user is ADMIN, he might not have a partner profile, so this check could fail for admin. 
        // For now, let's assume strictly Partner deletion. Admin deletion might need separate logic.

        if (benefit.partner.userId !== userId) {
            // Check if user is admin? 
            // For MVP, strict ownership check is safer. 
            throw new BadRequestException('You do not own this benefit.');
        }

        await this.benefitsRepository.delete(id);
    }

    // --- Public/User Access ---

    async findAllActive(): Promise<Benefit[]> {
        const now = new Date();
        return this.benefitsRepository.find({
            where: {
                isActive: true,
                // Logic for validity dates should be handled carefully or filtered in JS if needed
            },
            relations: ['partner'],
            order: { createdAt: 'DESC' },
        });
    }

    // --- Redemption Logic ---

    async requestRedemption(benefitId: string, user: User): Promise<Redemption> {
        const benefit = await this.benefitsRepository.findOneBy({ id: benefitId });
        if (!benefit) throw new NotFoundException('Benefit not found');
        if (!benefit.isActive) throw new BadRequestException('Benefit is inactive');

        // Check if valid date range
        const now = new Date();
        if (benefit.validFrom && now < benefit.validFrom) throw new BadRequestException('Benefit has not started yet');
        if (benefit.validUntil && now > benefit.validUntil) throw new BadRequestException('Benefit has expired');

        // Check if user already has a pending redemption for this benefit? 
        // Maybe allow multiple? Let's assume 1 active per benefit for now.
        const existing = await this.redemptionsRepository.findOne({
            where: {
                benefitId,
                userId: user.id,
                status: RedemptionStatus.PENDING
            }
        });
        if (existing) return existing;

        // Generate unique code
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();

        const redemption = this.redemptionsRepository.create({
            benefit,
            user,
            code,
            status: RedemptionStatus.PENDING,
        });

        return this.redemptionsRepository.save(redemption);
    }

    async getMyRedemptions(userId: string): Promise<Redemption[]> {
        try {
            return await this.redemptionsRepository.find({
                where: { userId },
                relations: ['benefit', 'benefit.partner'],
                // relations: ['benefit'], // Try listing only benefit first
                order: { createdAt: 'DESC' }
            });
        } catch (error) {
            console.error('Error in getMyRedemptions:', error);
            throw error;
        }
    }

    async validateRedemption(code: string, userId: string): Promise<Redemption> {
        const partner = await this.partnersService.findOneByUserId(userId);
        if (!partner) throw new BadRequestException('You are not a partner.');

        const redemption = await this.redemptionsRepository.findOne({
            where: { code },
            relations: ['benefit', 'benefit.partner', 'user'],
        });

        if (!redemption) throw new NotFoundException('Invalid code.');

        if (redemption.benefit.partnerId !== partner.id) {
            throw new BadRequestException('This coupon belongs to another partner.');
        }

        if (redemption.status !== RedemptionStatus.PENDING) {
            throw new BadRequestException(`Coupon status is ${redemption.status}. It cannot be redeemed.`);
        }

        redemption.status = RedemptionStatus.REDEEMED;
        redemption.redeemedAt = new Date();

        return this.redemptionsRepository.save(redemption);
    }
}
