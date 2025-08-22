import { Module } from '@nestjs/common';
import { OrganizerService } from './organizer.service';
import { OrganizerController } from './organizer.controller';
import { UsersModule } from '../users/users.module';
import { EventsModule } from '../events/events.module';
import { TicketTiersModule } from '../ticket-tiers/ticket-tiers.module';
import { TicketsModule } from '../tickets/tickets.module';
import { MailModule } from '../mail/mail.module';
import { ConfigurationModule } from '../configuration/configuration.module';
import { TypeOrmModule } from '@nestjs/typeorm'; // 1. Importar
import { Ticket } from '../tickets/ticket.entity';   // 2. Importar

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket]), // 3. Añadir
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