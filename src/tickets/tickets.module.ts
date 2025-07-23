import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './ticket.entity';
import { UsersModule } from 'src/users/users.module';
import { EventsModule } from 'src/events/events.module';
import { TicketTier } from 'src/ticket-tiers/ticket-tier.entity'; // <-- IMPORTAR

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, TicketTier]), // <-- AÑADIR TicketTier
    UsersModule,
    EventsModule,
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}