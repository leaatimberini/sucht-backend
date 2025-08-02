// backend/src/tickets/ticket.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User, UserRole } from '../users/user.entity';
import { Event } from '../events/event.entity';
import { TicketTier } from 'src/ticket-tiers/ticket-tier.entity';
import { TicketStatus } from './enums/ticket-status.enum'; // CORRECCIÓN: Se importa el enum

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.tickets, { eager: false })
  user: User;

  @ManyToOne(() => Event, (event) => event.tickets, { eager: false })
  event: Event;

  @ManyToOne(() => TicketTier, { eager: false })
  tier: TicketTier;

  @ManyToOne(() => User, (user) => user.promotedTickets, {
    nullable: true,
    eager: true,
  })
  promoter: User | null;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.VALID,
  })
  status: TicketStatus;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'int', default: 0 })
  redeemedCount: number;
  
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
  amountPaid: number;
  
  @Column({ type: 'timestamp', nullable: true })
  confirmedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  validatedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  reminderSentAt?: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}

export { TicketStatus };
