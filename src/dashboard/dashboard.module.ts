import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from 'src/tickets/ticket.entity';
import { Event } from 'src/events/event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, Event])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}