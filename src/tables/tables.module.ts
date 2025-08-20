// src/tables/tables.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TablesService } from './tables.service';
import { TablesController } from './tables.controller';
import { Table } from './table.entity';
import { TableCategory } from './table-category.entity';
import { TableReservation } from './table-reservation.entity';
import { EventsModule } from 'src/events/events.module';
import { TicketsModule } from 'src/tickets/tickets.module';
import { TicketTiersModule } from 'src/ticket-tiers/ticket-tiers.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Table, TableCategory, TableReservation]), 
    EventsModule,
    TicketsModule,
    TicketTiersModule,
    UsersModule,
  ],
  controllers: [TablesController],
  providers: [TablesService],
  exports: [TablesService],
})
export class TablesModule {}