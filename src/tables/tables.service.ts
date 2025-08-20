// backend/src/tables/tables.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Table, TableStatus } from './table.entity';
import { TableCategory } from './table-category.entity';
import { EventsService } from 'src/events/events.service';

@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    @InjectRepository(TableCategory)
    private readonly tableCategoryRepository: Repository<TableCategory>,
    private readonly eventsService: EventsService,
  ) {}

  // --- Lógica de Categorías ---
  async createCategory(name: string): Promise<TableCategory> {
    const category = this.tableCategoryRepository.create({ name });
    return this.tableCategoryRepository.save(category);
  }

  async findAllCategories(): Promise<TableCategory[]> {
    return this.tableCategoryRepository.find();
  }

  // --- Lógica de Mesas ---
  async createTable(tableNumber: string, categoryId: string, eventId: string): Promise<Table> {
    const event = await this.eventsService.findOne(eventId);
    if (!event) throw new NotFoundException('Evento no encontrado.');

    const category = await this.tableCategoryRepository.findOneBy({ id: categoryId });
    if (!category) throw new NotFoundException('Categoría de mesa no encontrada.');

    const table = this.tableRepository.create({
      tableNumber,
      category,
      event,
      status: TableStatus.AVAILABLE,
    });
    return this.tableRepository.save(table);
  }

  async findTablesForEvent(eventId: string): Promise<Table[]> {
    return this.tableRepository.find({
      where: { eventId },
      relations: ['category'],
      order: { tableNumber: 'ASC' },
    });
  }
}