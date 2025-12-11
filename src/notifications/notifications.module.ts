// src/notifications/notifications.module.ts
import { Module, forwardRef } from '@nestjs/common'; // 1. Importar forwardRef
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { TelegramService } from './telegram.service';
import { PushSubscription } from './entities/subscription.entity';
import { Notification } from './entities/notification.entity';
import { UsersModule } from '../users/users.module';
import { MailModule } from 'src/mail/mail.module';
import { DashboardModule } from 'src/dashboard/dashboard.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PushSubscription, Notification]),
    MailModule,
    // 2. Envolvemos UsersModule en forwardRef
    forwardRef(() => UsersModule),
    DashboardModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, TelegramService],
  exports: [NotificationsService, TelegramService],
})
export class NotificationsModule { }