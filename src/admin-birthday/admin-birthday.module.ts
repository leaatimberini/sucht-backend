import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminBirthdayController } from './admin-birthday.controller';
import { AdminBirthdayService } from './admin-birthday.service';
import { Ticket } from '../tickets/ticket.entity';
import { UserReward } from '../rewards/user-reward.entity';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [
    // Damos acceso a los repositorios de Ticket y UserReward
    TypeOrmModule.forFeature([Ticket, UserReward]),
    // Importamos TicketsModule para poder usar TicketsService
    TicketsModule,
  ],
  controllers: [AdminBirthdayController],
  providers: [AdminBirthdayService],
})
export class AdminBirthdayModule {}