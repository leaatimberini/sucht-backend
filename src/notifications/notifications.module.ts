import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PushSubscription } from './entities/subscription.entity';
import { Notification } from './entities/notification.entity'; // 1. IMPORTAR LA NUEVA ENTIDAD

@Module({
  // 2. AÑADIR LA ENTIDAD AL REGISTRO DE TYPEORM
  imports: [TypeOrmModule.forFeature([PushSubscription, Notification])],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}