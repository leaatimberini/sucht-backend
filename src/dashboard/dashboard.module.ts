import { Module, forwardRef } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from 'src/tickets/ticket.entity';
import { Event } from 'src/events/event.entity';
import { User } from 'src/users/user.entity';
import { TicketsModule } from 'src/tickets/tickets.module';
import { TicketTier } from 'src/ticket-tiers/ticket-tier.entity'; // ✅ CORRECCIÓN: Ruta de importación correcta

@Module({
    imports: [
        TypeOrmModule.forFeature([Ticket, Event, User, TicketTier]),
        forwardRef(() => TicketsModule),
    ],
    controllers: [DashboardController],
    providers: [DashboardService],
    exports: [DashboardService],
})
export class DashboardModule {}