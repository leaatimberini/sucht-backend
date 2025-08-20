// backend/src/tables/table-category.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Table } from './table.entity';

@Entity('table_categories')
export class TableCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // Ej: "VIP", "Pista", "Cabina"

  @OneToMany(() => Table, table => table.category)
  tables: Table[];
}