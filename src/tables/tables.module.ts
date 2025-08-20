import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TablesService } from './tables.service';
import { TablesController } from './tables.controller';
import { Table } from './table.entity';
import { TableCategory } from './table-category.entity';
import { EventsModule } from 'src/events/events.module';
import { TableReservation } from './table-reservation.entity';
import { TicketsModule } from 'src/tickets/tickets.module';
import { TicketTiersModule } from 'src/ticket-tiers/ticket-tiers.module';
// MailModule y ConfigurationModule ya son globales, así que no es estrictamente necesario
// importarlos aquí, pero es una buena práctica para la claridad del código.
import { MailModule } from 'src/mail/mail.module';
import { ConfigurationModule } from 'src/configuration/configuration.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Table, TableCategory, TableReservation]),
    EventsModule,
    TicketsModule,
    TicketTiersModule,
    MailModule, // <-- Añadido
    ConfigurationModule, // <-- Añadido
  ],
  controllers: [TablesController],
  providers: [TablesService],
})
export class TablesModule {}