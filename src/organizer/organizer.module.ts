// src/organizer/organizer.module.ts

import { Module } from '@nestjs/common';
import { OrganizerService } from './organizer.service';
import { OrganizerController } from './organizer.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from '../tickets/ticket.entity';
import { TicketTier } from '../ticket-tiers/ticket-tier.entity'; // 1. Importar TicketTier
import { UsersModule } from '../users/users.module';
import { EventsModule } from '../events/events.module';
import { TicketTiersModule } from '../ticket-tiers/ticket-tiers.module';
import { TicketsModule } from '../tickets/tickets.module';
import { MailModule } from '../mail/mail.module';
import { ConfigurationModule } from '../configuration/configuration.module';

@Module({
  imports: [
    // 2. Añadir TicketTier a la lista de entidades que este módulo puede manejar.
    TypeOrmModule.forFeature([Ticket, TicketTier]), 
    
    // El resto de los módulos que necesita el servicio
    UsersModule,
    EventsModule,
    TicketTiersModule,
    TicketsModule,
    MailModule,
    ConfigurationModule,
  ],
  controllers: [OrganizerController],
  providers: [OrganizerService],
})
export class OrganizerModule {}