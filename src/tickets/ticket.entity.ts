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
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.tickets)
  user: User;

  @ManyToOne(() => Event, (event) => event.tickets)
  event: Event;

  @ManyToOne(() => TicketTier)
  tier: TicketTier;

  // --- CAMPO REQUERIDO ---
  @ManyToOne(() => User, { nullable: true, eager: true }) // eager: true para cargar siempre el promotor
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

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  validatedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
