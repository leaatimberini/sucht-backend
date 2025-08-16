// src/raffles/raffle.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RaffleWinner } from './raffle-winner.entity';
import { RaffleService } from './raffle.service';
import { EventsModule } from '../events/events.module';
import { TicketsModule } from '../tickets/tickets.module';
import { ConfigurationModule } from '../configuration/configuration.module';
import { StoreModule } from '../store/store.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RaffleController } from './raffle.controller';

@Module({
  imports: [
    // Registramos la nueva entidad en TypeORM
    TypeOrmModule.forFeature([RaffleWinner]),
    // Importamos todos los módulos cuyos servicios vamos a necesitar
    EventsModule,
    TicketsModule,
    ConfigurationModule,
    StoreModule,
    UsersModule,
    NotificationsModule,
  ],
  providers: [RaffleService],
  // Añadiremos el controlador en el siguiente paso
  controllers: [RaffleController],
})
export class RaffleModule {}