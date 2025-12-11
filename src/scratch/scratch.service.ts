
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ScratchPrize, ScratchPrizeType } from './items/scratch-prize.entity';
import { ScratchAttempt } from './items/scratch-attempt.entity';
import { User } from '../users/user.entity';

import { RewardsService } from '../rewards/rewards.service';

@Injectable()
export class ScratchService {
    constructor(
        @InjectRepository(ScratchPrize)
        private prizesRepo: Repository<ScratchPrize>,
        @InjectRepository(ScratchAttempt)
        private attemptsRepo: Repository<ScratchAttempt>,
        private rewardsService: RewardsService
    ) { }

    async getUserStatus(userId: string) {
        const lastAttempt = await this.attemptsRepo.findOne({
            where: { userId },
            order: { playedAt: 'DESC' }
        });

        if (!lastAttempt) {
            return { canPlay: true, nextAttempt: null };
        }

        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
        const diff = Date.now() - lastAttempt.playedAt.getTime();

        if (diff < SEVEN_DAYS_MS) {
            return {
                canPlay: false,
                nextAttempt: new Date(lastAttempt.playedAt.getTime() + SEVEN_DAYS_MS),
                lastResult: { didWin: lastAttempt.didWin, prizeId: lastAttempt.prizeId }
            };
        }

        return { canPlay: true, nextAttempt: null };
    }

    async play(userId: string) {
        const status = await this.getUserStatus(userId);
        if (!status.canPlay) {
            throw new BadRequestException(`Cooldown active. Available at ${status.nextAttempt}`);
        }

        // --- RNG LOGIC ---
        const prizes = await this.prizesRepo.find({ where: { isActive: true } });
        const validPrizes = prizes.filter(p => p.stock > 0);

        // Normalize probabilities if needed, or assume they sum to <= 100
        const roll = Math.random() * 100;
        let cumulative = 0;
        let wonPrize: ScratchPrize | null = null;

        for (const prize of validPrizes) {
            cumulative += Number(prize.probability);
            if (roll < cumulative) {
                wonPrize = prize;
                break;
            }
        }

        // 3. Record Attempt
        const attempt = this.attemptsRepo.create({
            userId,
            didWin: !!wonPrize,
            prize: wonPrize ?? undefined, // FixType: TypeORM create expects undefined not null
            playedAt: new Date(),
            claimed: false
        });

        const savedAttempt = await this.attemptsRepo.save(attempt);

        if (wonPrize) {
            // Decrement Stock
            await this.prizesRepo.decrement({ id: wonPrize.id }, 'stock', 1);

            // If it's an INTERNAL prize linked to a Reward, assign it immediately
            if (wonPrize.type === ScratchPrizeType.INTERNAL && wonPrize.rewardId) {
                await this.rewardsService.assignRewardToUser(userId, wonPrize.rewardId, 'SCRATCH');
                // We auto-mark attempt as claimed because the UserReward is now the actionable item
                attempt.claimed = true;
                await this.attemptsRepo.save(attempt);
            }
        }

        // Return result with populated prize for UI
        return {
            result: wonPrize ? 'WIN' : 'LOSE',
            prize: wonPrize,
            attemptId: savedAttempt.id,
            playedAt: savedAttempt.playedAt,
            isCoupon: wonPrize?.type === ScratchPrizeType.PARTNER // Flag for UI
        };
    }

    async redeem(attemptId: string, userId: string) {
        const attempt = await this.attemptsRepo.findOne({
            where: { id: attemptId },
            relations: ['prize', 'prize.partner']
        });

        if (!attempt) throw new BadRequestException('Invalid Scratch Code');
        if (attempt.claimed) throw new BadRequestException('Prize already claimed');
        if (!attempt.didWin || !attempt.prize) throw new BadRequestException('No prize associated with this code');

        // Validation Logic
        if (attempt.prize.type === ScratchPrizeType.PARTNER) {
            // Only the specific partner should be able to redeem? 
            // In a real scenario, we check the requesting user (scanner) against attempt.prize.partner.userId
            // For now, allow generic redemption or check logic in Controller
        }

        attempt.claimed = true;
        await this.attemptsRepo.save(attempt);

        return {
            success: true,
            prizeName: attempt.prize.name,
            redeemedAt: new Date()
        };
    }

    async getPrizes(user: User) {
        if (user.roles.includes('admin' as any)) { // Casting to avoid import churn if UserRole enum not imported
            return this.prizesRepo.find({ order: { probability: 'ASC' }, relations: ['partner', 'product'] });
        }
        if (user.roles.includes('partner' as any)) {
            return this.prizesRepo.find({
                where: { partner: { userId: user.id } },
                order: { probability: 'ASC' },
                relations: ['partner', 'product']
            });
        }
        return [];
    }
    async createPrize(data: any) {
        // Sanitize rewardId if it's an empty string (common with frontend forms)
        if (data.rewardId === '') {
            data.rewardId = null;
        }
        const prize = this.prizesRepo.create(data);
        return this.prizesRepo.save(prize);
    }

    async updatePrize(id: string, data: any) {
        // Sanitize rewardId
        if (data.rewardId === '') {
            data.rewardId = null;
        }
        await this.prizesRepo.update(id, data);
        return this.prizesRepo.findOne({ where: { id } });
    }



    async deletePrize(id: string) {
        try {
            return await this.prizesRepo.delete(id);
        } catch (error: any) {
            // Check for foreign key constraint violation (Postgres code 23503)
            if (error.code === '23503') {
                // Cannot delete because it's referenced (won/attempted)
                // Fallback: Soft delete / Deactivate
                await this.prizesRepo.update(id, { isActive: false });
                throw new BadRequestException('El premio no se puede eliminar porque ya tiene historial de ganadores. Se ha desactivado en su lugar.');
            }
            throw error;
        }
    }

    async getPartnerHistory(userId: string) {
        return this.attemptsRepo.find({
            where: { prize: { partner: { userId } }, claimed: true },
            relations: ['prize', 'user'] as any,
            order: { playedAt: 'DESC' },
            take: 50
        });
    }

    async getAllHistory() {
        return this.attemptsRepo.find({
            relations: ['prize', 'user'] as any,
            order: { playedAt: 'DESC' },
            take: 100
        });
    }
}
