import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { Event } from '../events/event.entity';
import { TableCategory } from './table-category.entity';
import { Ticket } from '../tickets/ticket.entity';

export enum TableStatus {
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  OCCUPIED = 'occupied',
  UNAVAILABLE = 'unavailable',
}

@Entity('tables')
export class Table {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' }) // <-- CORRECCIÓN
  tableNumber: string;

  @ManyToOne(() => TableCategory, category => category.tables, { eager: true })
  @JoinColumn({ name: 'categoryId' })
  category: TableCategory;

  @Column()
  categoryId: string;

  @ManyToOne(() => Event)
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column()
  eventId: string;

  @Column({ type: 'enum', enum: TableStatus, default: TableStatus.AVAILABLE })
  status: TableStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  positionX: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  positionY: number | null;
  
  @OneToOne(() => Ticket, { nullable: true })
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket | null;

  @Column({ type: 'uuid', nullable: true }) // <-- CORRECCIÓN
  ticketId: string | null;
}