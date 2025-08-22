import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RaffleService } from './raffle.service';
import { RaffleController } from './raffle.controller';
import { Raffle } from './raffle.entity';
import { RaffleWinner } from './raffle-winner.entity';
import { RafflePrize } from './raffle-prize.entity';
import { EventsModule } from '../events/events.module';
import { TicketsModule } from '../tickets/tickets.module';
import { StoreModule } from '../store/store.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Raffle, RaffleWinner, RafflePrize]),
    EventsModule,
    TicketsModule,
    StoreModule,
    UsersModule,
    NotificationsModule,
  ],
  controllers: [RaffleController],
  providers: [RaffleService],
})
export class RaffleModule {}