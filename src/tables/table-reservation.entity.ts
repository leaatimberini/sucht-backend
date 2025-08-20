// src/tables/table-reservation.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, OneToOne } from 'typeorm';
import { Event } from '../events/event.entity';
import { Table } from './table.entity';
import { User } from '../users/user.entity';
import { Ticket } from '../tickets/ticket.entity';

export enum PaymentType {
  FULL = 'full',
  DEPOSIT = 'deposit',
  GIFT = 'gift',
}

@Entity('table_reservations')
export class TableReservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Event)
  @JoinColumn({ name: 'eventId' })
  event: Event;
  @Column()
  eventId: string;

  @ManyToOne(() => Table)
  @JoinColumn({ name: 'tableId' })
  table: Table;
  @Column()
  tableId: string;

  // Datos del cliente que reserva
  @Column()
  clientName: string;

  @Column({ nullable: true })
  clientEmail?: string;

  // Staff que gestionó la reserva (para ventas manuales)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'reservedByUserId' })
  reservedByUser: User;
  @Column()
  reservedByUserId: string;

  @Column({ type: 'enum', enum: PaymentType })
  paymentType: PaymentType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amountPaid: number;

  @Column()
  guestCount: number;

  // Ticket asociado que contiene el QR para el ingreso
  @OneToOne(() => Ticket)
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;
  @Column()
  ticketId: string;

  @CreateDateColumn()
  createdAt: Date;
}