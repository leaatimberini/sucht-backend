// src/notifications/notifications.module.ts
import { Module, forwardRef } from '@nestjs/common'; // 1. Importar forwardRef
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PushSubscription } from './entities/subscription.entity';
import { Notification } from './entities/notification.entity';
import { UsersModule } from '../users/users.module';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PushSubscription, Notification]),
    MailModule,
    // 2. Envolvemos UsersModule en forwardRef
    forwardRef(() => UsersModule),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule { }