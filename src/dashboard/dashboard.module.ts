import { Module, forwardRef } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from 'src/tickets/ticket.entity';
import { Event } from 'src/events/event.entity';
import { User } from 'src/users/user.entity';
import { TicketsModule } from 'src/tickets/tickets.module'; // 1. Importar TicketsModule

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, Event, User]),
    // 2. Añadir TicketsModule para que DashboardService pueda usar TicketsService
    forwardRef(() => TicketsModule),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}