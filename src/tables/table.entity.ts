// backend/src/tables/table.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { Event } from '../events/event.entity';
import { TableCategory } from './table-category.entity';
import { Ticket } from '../tickets/ticket.entity';

export enum TableStatus {
  AVAILABLE = 'available',
  RESERVED = 'reserved',      // Reservada a través de un pago
  OCCUPIED = 'occupied',      // Marcada manualmente por un admin/organizador
  UNAVAILABLE = 'unavailable',  // No está a la venta
}

@Entity('tables')
export class Table {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tableNumber: string; // Ej: "01", "02", "07"

  @ManyToOne(() => TableCategory, category => category.tables, { eager: true })
  @JoinColumn({ name: 'categoryId' })
  category: TableCategory;

  @Column()
  categoryId: string;

  // Cada mesa pertenece a un evento específico
  @ManyToOne(() => Event)
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column()
  eventId: string;

  @Column({
    type: 'enum',
    enum: TableStatus,
    default: TableStatus.AVAILABLE,
  })
  status: TableStatus;

  // Cuando una mesa se vende, se asocia con el Ticket correspondiente
  @OneToOne(() => Ticket, { nullable: true })
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket | null;

  @Column({ nullable: true })
  ticketId: string | null;
}