import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnersService } from './partners.service';
import { PartnersController } from './partners.controller';
import { Partner } from './partner.entity';
import { PartnerView } from './partner-view.entity';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { MailModule } from 'src/mail/mail.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Partner, PartnerView]),
        CloudinaryModule,
        MailModule,
        forwardRef(() => NotificationsModule), // Needed for TelegramService
    ],
    controllers: [PartnersController],
    providers: [PartnersService],
    exports: [PartnersService],
})
export class PartnersModule { }
