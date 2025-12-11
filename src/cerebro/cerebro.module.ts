
import { Module } from '@nestjs/common';
import { CerebroService } from './cerebro.service';
import { ScraperService } from './scraper.service';
import { MarketingModule } from '../marketing/marketing.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [MarketingModule, NotificationsModule],
    providers: [CerebroService, ScraperService],
    exports: [CerebroService]
})
export class CerebroModule { }
