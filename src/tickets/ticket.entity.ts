// src/tickets/ticket.entity.ts
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
  INVALIDATED = 'invalidated',
  PARTIALLY_PAID = 'partially_paid',
  REDEEMED = 'redeemed',
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
  
  @Column({ type: 'varchar', nullable: true })
  origin: string | null;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'int', default: 0 })
  redeemedCount: number;
  
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
  amountPaid: number;
  
  @Column({ type: 'varchar', nullable: true, unique: true })
  paymentId: string | null;

  // --- NUEVOS CAMPOS PARA INVITACIONES ESPECIALES ---

  /**
   * Si es 'true', este ticket otorga acceso al sector VIP.
   * El verificador verá una alerta especial.
   */
  @Column({ type: 'boolean', default: false })
  isVipAccess: boolean;

  /**
   * Instrucciones especiales para el personal de puerta.
   * Ej: "INGRESO SIN FILA".
   */
  @Column({ type: 'varchar', nullable: true })
  specialInstructions: string | null;

  // --- FIN DE NUEVOS CAMPOS ---

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