import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from 'src/tickets/ticket.entity';
import { Event } from 'src/events/event.entity';
import { User } from 'src/users/user.entity'; // 1. IMPORTAR

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, Event, User])], // 2. AÑADIR User
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
