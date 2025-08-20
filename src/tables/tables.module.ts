import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TablesService } from './tables.service';
import { TablesController } from './tables.controller';
import { Table } from './table.entity';
import { TableCategory } from './table-category.entity';
import { EventsModule } from 'src/events/events.module';
import { TicketsModule } from 'src/tickets/tickets.module';
import { TicketTiersModule } from 'src/ticket-tiers/ticket-tiers.module';
import { TableReservation } from './table-reservation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Table, TableCategory, TableReservation]),
    EventsModule,
    TicketsModule,
    TicketTiersModule,
  ],
  controllers: [TablesController],
  providers: [TablesService],
})
export class TablesModule {}