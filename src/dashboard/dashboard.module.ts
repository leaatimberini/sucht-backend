import { Module, forwardRef } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from 'src/tickets/ticket.entity';
import { Event } from 'src/events/event.entity';
import { User } from 'src/users/user.entity';
import { TicketsModule } from 'src/tickets/tickets.module';
import { TicketTier } from 'src/ticket-tiers/ticket-tier.entity'; // 1. Importar la entidad TicketTier

@Module({
    imports: [
        TypeOrmModule.forFeature([Ticket, Event, User, TicketTier]), // 2. Añadir TicketTier al array
        forwardRef(() => TicketsModule),
    ],
    controllers: [DashboardController],
    providers: [DashboardService],
    exports: [DashboardService], // 3. Opcional: Exportar el servicio si otros módulos lo necesitan
})
export class DashboardModule {}