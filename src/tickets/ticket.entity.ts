import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Event } from '../events/event.entity';
import { TicketTier } from 'src/ticket-tiers/ticket-tier.entity';

export enum TicketStatus {
  VALID = 'valid',
  USED = 'used',
  PARTIALLY_USED = 'partially_used',
  INVALID = 'invalid',
  PARTIALLY_PAID = 'partially_paid', // <-- NUEVO ESTADO
}

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
  
  // --- NUEVO CAMPO PARA REGISTRAR EL PAGO ---
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
  amountPaid: number;
  // --- FIN DE NUEVO CAMPO ---

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