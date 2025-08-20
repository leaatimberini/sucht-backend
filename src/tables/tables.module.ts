import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TablesService } from './tables.service';
import { TablesController } from './tables.controller';
import { Table } from './table.entity';
import { TableCategory } from './table-category.entity';
import { EventsModule } from 'src/events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Table, TableCategory]),
    EventsModule
  ],
  controllers: [TablesController],
  providers: [TablesService],
})
export class TablesModule {}