
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AiService } from '../marketing/ai.service';
import { ScraperService } from './scraper.service';
import { TelegramService } from '../notifications/telegram.service';

@Injectable()
export class CerebroService implements OnModuleInit {
    private readonly logger = new Logger(CerebroService.name);

    constructor(
        private readonly aiService: AiService,
        private readonly scraperService: ScraperService,
        private readonly telegramService: TelegramService
    ) { }

    onModuleInit() {
        this.telegramService.registerActionHandler(this.handleAction.bind(this));
    }

    async handleAction(action: string, proposalId: string): Promise<boolean> {
        // Solo manejar acciones genéricas 'approve' o 'reject' (asumimos que son de propuestas de Cerebro)
        // Idealmente deberíamos prefijar las acciones de Cerebro, ej: approve_proposal
        if (action !== 'approve' && action !== 'reject') {
            return false;
        }

        this.logger.log(`Received action: ${action} for proposal: ${proposalId}`);

        if (action === 'approve') {
            await this.executeProposal(proposalId);
            await this.telegramService.sendNotification(`✅ Propuesta ${proposalId} aplicada exitosamente.`);
        } else if (action === 'reject') {
            await this.telegramService.sendNotification(`❌ Propuesta ${proposalId} rechazada.`);
        }
        return true;
    }

    async executeProposal(proposalId: string) {
        this.logger.log(`Executing Proposal Logic for ${proposalId}...`);
        // TODO: Map proposalId to actual logic (update params, etc.)
        // specific logic implementation will go here
    }

    async analyzeBrandPersona() {
        this.logger.log('🧠 Cerebro is analyzing the brand...');

        // 1. Scrape Website
        const webData = await this.scraperService.scrapeWebsite('https://sucht.com.ar'); // Configurable later

        // 2. AI Profiling (To be implemented in AiService)
        // const profile = await this.aiService.generateTargetingProfile(webData);

        // Mock for now until AiService is updated
        const profile = {
            keywords: webData.keywords,
            persona: "Cachengue & Competitor Hunter (Castelar/Leloir)",
            recommendedInterests: ["Reggaeton", "Cumbia", "Latin Pop", "Bars", "Nightclub"]
        };

        this.logger.log(`Analysis Complete. Keywords: ${profile.keywords.join(', ')}`);

        const proposalId = `analysis_${Date.now()}`;

        // 3. Notify Admin (Preview) with Action Buttons
        await this.telegramService.sendProposal(
            'Nuevo Perfil de Audiencia Detectado',
            `*Detected Persona:* ${profile.persona}\n` +
            `*Keywords:* ${profile.keywords.slice(0, 5).join(', ')}\n` +
            `*Recommended Interests:* ${profile.recommendedInterests.join(', ')}`,
            proposalId
        );

        return profile;
    }
}
