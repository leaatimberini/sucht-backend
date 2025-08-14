import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PushSubscription } from './entities/subscription.entity';
import { Notification } from './entities/notification.entity';
import { UsersModule } from '../users/users.module'; // 1. Importar UsersModule

@Module({
  imports: [
    TypeOrmModule.forFeature([PushSubscription, Notification]),
    // 2. Añadir UsersModule para que NotificationsService pueda usar UsersService.
    // Usamos forwardRef para prevenir problemas de dependencias circulares.
    forwardRef(() => UsersModule),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}