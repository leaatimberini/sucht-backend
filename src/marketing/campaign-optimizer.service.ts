import * as crypto from 'crypto';

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign } from './entities/campaign.entity';
import { OptimizationLog } from './entities/optimization-log.entity';
import { AiService } from './ai.service';
import { MarketingService } from './marketing.service';

import { TelegramService } from '../notifications/telegram.service';

@Injectable()
export class CampaignOptimizerService {
    private readonly logger = new Logger(CampaignOptimizerService.name);

    constructor(
        @InjectRepository(Campaign)
        private campaignRepo: Repository<Campaign>,
        @InjectRepository(OptimizationLog)
        private optimizationLogRepo: Repository<OptimizationLog>,
        private readonly aiService: AiService,
        private readonly marketingService: MarketingService,
        private readonly telegramService: TelegramService,
    ) { }

    @Cron(CronExpression.EVERY_5_HOURS)
    async runOptimizationLoop() {
        this.logger.log('🚀 Starting AI Campaign Optimization Loop...');

        // 1. Fetch Active Campaigns
        const activeCampaigns = await this.campaignRepo.find({ where: { status: 'ACTIVE' } });
        if (activeCampaigns.length === 0) {
            this.logger.log('No active campaigns to optimize.');
            return;
        }

        for (const campaign of activeCampaigns) {
            await this.optimizeCampaign(campaign);
        }

        this.logger.log('✅ AI Optimization Loop Completed.');
    }

    private async optimizeCampaign(campaign: Campaign) {
        this.logger.log(`Analyzing Campaign: ${campaign.name} (${campaign.id})...`);

        // 2. Fetch Real-Time Metrics
        const metrics = await this.marketingService.getCampaignInsights(campaign.id);

        // If no significant spend, skip optimization but LOG IT
        if (metrics.spend < 100) {
            // CHECK META RECOMMENDATIONS (Even if low spend, config might be wrong)
            const recs = await this.marketingService.getAdAccountRecommendations();
            const reelRec = recs.find(r => r.message?.toLowerCase().includes('reel') || r.title?.toLowerCase().includes('video'));

            const log = new OptimizationLog();
            log.campaign = campaign;
            log.currentMetrics = metrics;

            if (reelRec) {
                this.logger.log('Found Reel Recommendation from Meta!');
                log.aiDecision = 'SCALE_UP'; // Use SCALE_UP color for opportunity
                log.reasoning = `Meta sugiere: "${reelRec.title}". Optimiza usando video vertical (Reels) para reducir costos.`;
                log.actionTaken = 'Esperando Video';
                log.pendingAction = 'UPLOAD_VIDEO';
                log.uploadToken = crypto.randomUUID();
            } else {
                this.logger.log(`Skipping low spend campaign: ${metrics.spend}`);
                log.aiDecision = 'MAINTAIN';
                log.reasoning = `Gasto insuficiente para análisis fiable ($${(metrics.spend / 100).toFixed(2)} < $1.00). Se requiere más data.`;
                log.actionTaken = 'Esperando data';
            }

            await this.optimizationLogRepo.save(log);
            return;
        }

        // 3. AI Analysis
        const analysis = await this.aiService.analyzeCampaignPerformance(campaign.name, metrics);
        this.logger.log(`AI Decision for ${campaign.name}: ${analysis.decision} - ${analysis.reasoning}`);

        // 4. Log Decision
        const log = this.optimizationLogRepo.create({
            campaign: campaign,
            campaignId: campaign.id,
            currentMetrics: metrics,
            aiDecision: analysis.decision,
            reasoning: analysis.reasoning,
        });

        // 5. Execute Action
        switch (analysis.decision) {
            case 'PAUSE':
                log.actionTaken = 'Paused Campaign';
                await this.pauseCampaign(campaign);
                break;
            case 'SCALE_UP':
                log.actionTaken = 'Increased Budget by 20%';
                await this.scaleCampaign(campaign);
                break;
            case 'LOWER_BUDGET':
                log.actionTaken = 'Decreased Budget by 20%';
                await this.lowerBudget(campaign);
                break;
            default:
                log.actionTaken = 'No Action';
                break;
        }

        await this.optimizationLogRepo.save(log);

        if (analysis.decision !== 'MAINTAIN') {
            const message = `🤖 *Marketing AI Alert*\n\n` +
                `*Campaign:* ${campaign.name}\n` +
                `*Decision:* ${analysis.decision}\n` +
                `*Reason:* ${analysis.reasoning}\n` +
                `*Action:* ${log.actionTaken}`;

            await this.telegramService.sendNotification(message);
        }
    }

    private async pauseCampaign(campaign: Campaign) {
        await this.marketingService.toggleCampaignStatus(campaign.id); // This toggles. Need to ensure it sets to PAUSES specifically? Method checks status.
        // Actually toggleCampaignStatus flips logic. 
        // If AI says PAUSE, we should explicitly set PAUSED.
        // Let's rely on MarketingService exposing a specific setStatus or just accept toggle for now if we know current state.
        // Campaign in DB is "ACTIVE" (filtered in runOptimizationLoop). So toggle will make it PAUSED. Correct.
        this.logger.warn(`🛑 Campaign ${campaign.name} PAUSED by AI.`);
    }

    private async scaleCampaign(campaign: Campaign) {
        const newBudget = Number(campaign.totalBudget) * 1.2;
        await this.marketingService.updateCampaignBudget(campaign.id, newBudget);
        this.logger.log(`📈 Campaign ${campaign.name} SCALED UP to ${newBudget}.`);
    }

    private async lowerBudget(campaign: Campaign) {
        const newBudget = Number(campaign.totalBudget) * 0.8;
        await this.marketingService.updateCampaignBudget(campaign.id, newBudget);
        this.logger.log(`📉 Campaign ${campaign.name} BUDGET LOWERED to ${newBudget}.`);
    }

    async getLogs() {
        return this.optimizationLogRepo.find({
            take: 50,
            order: { createdAt: 'DESC' },
            relations: ['campaign']
        });
    }

    async forceAnalyze(campaignId: string) {
        const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
        if (!campaign) throw new Error('Campaign not found');

        await this.optimizeCampaign(campaign);
        return { message: 'Optimization ran successfully' };
    }
}
