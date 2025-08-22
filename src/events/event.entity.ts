import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Ticket } from 'src/tickets/ticket.entity';
import { TicketTier } from 'src/ticket-tiers/ticket-tier.entity';
import { Raffle } from 'src/raffles/raffle.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null; // <-- CORRECCIÓN

  @Column()
  location: string;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column({ nullable: true })
  flyerImageUrl: string | null; // <-- CORRECCIÓN

  @Column({ type: 'timestamp', nullable: true })
  confirmationSentAt: Date | null;

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
  
  @OneToOne(() => Raffle, (raffle) => raffle.event, {
    cascade: true,
    onDelete: 'SET NULL',
    nullable: true,
  })
  raffle: Raffle;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}