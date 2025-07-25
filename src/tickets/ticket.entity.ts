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
  USED = 'used', // Este estado ahora significará "completamente usada"
  PARTIALLY_USED = 'partially_used', // Nuevo estado para uso parcial
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

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.VALID,
  })
  status: TicketStatus;

  // NUEVOS CAMPOS
  @Column({ type: 'int', default: 1 })
  quantity: number; // Cuántas personas cubre esta entrada

  @Column({ type: 'int', default: 0 })
  redeemedCount: number; // Cuántas personas ya ingresaron con esta entrada

  @Column({ type: 'timestamp', nullable: true })
  validatedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}