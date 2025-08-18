import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Ticket } from 'src/tickets/ticket.entity';
import { TicketTier } from 'src/ticket-tiers/ticket-tier.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  location: string;

  // Se mantiene el tipo original para no romper la compatibilidad
  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column({ nullable: true })
  flyerImageUrl: string;

  @Column({ type: 'timestamp', nullable: true })
  confirmationSentAt: Date | null;

  // --- NUEVOS CAMPOS ---
  @Column({ type: 'boolean', default: false })
  isPublished: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  publishAt: Date | null;

  @OneToMany(() => Ticket, (ticket) => ticket.event, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  tickets: Ticket[];

  @OneToMany(() => TicketTier, (ticketTier) => ticketTier.event, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  ticketTiers: TicketTier[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}