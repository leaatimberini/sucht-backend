
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketingController } from './marketing.controller';
import { MarketingService } from './marketing.service';
import { MarketingAccount } from './entities/marketing-account.entity';
import { Campaign } from './entities/campaign.entity';
import { AdSet } from './entities/ad-set.entity';
import { AdCreative } from './entities/ad-creative.entity';
import { OptimizationLog } from './entities/optimization-log.entity';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import { AiService } from './ai.service';
import { CampaignOptimizerService } from './campaign-optimizer.service';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { CapiService } from './capi.service';
import { EventsModule } from '../events/events.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebhookController } from './webhook.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([MarketingAccount, Campaign, AdSet, AdCreative, OptimizationLog]),
        HttpModule,
        ConfigModule,
        EventsModule,
        UsersModule,
        NotificationsModule,
    ],
    controllers: [MarketingController, WhatsappController, WebhookController],
    providers: [MarketingService, AiService, WhatsappService, CapiService, CampaignOptimizerService],
    exports: [MarketingService, AiService, WhatsappService, CapiService, CampaignOptimizerService],
})
export class MarketingModule { }
