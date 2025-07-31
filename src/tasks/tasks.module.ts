// src/tasks/tasks.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';
import { TasksService } from './tasks.service';
// import { NotificationsModule } from 'src/notifications/notifications.module';
// import { LoyaltyModule } from 'src/loyalty/loyalty.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    // NotificationsModule, // Importar para usar el servicio de notificaciones
    // LoyaltyModule, // Importar para usar el servicio de puntos
  ],
  providers: [TasksService],
})
export class TasksModule {}