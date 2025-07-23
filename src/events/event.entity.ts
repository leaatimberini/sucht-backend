import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Ticket } from 'src/tickets/ticket.entity';
import { TicketTier } from 'src/ticket-tiers/ticket-tier.entity'; // 1. IMPORTAR

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

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;
      
  @Column({ nullable: true })
  flyerImageUrl: string;

  @OneToMany(() => Ticket, (ticket) => ticket.event)
  tickets: Ticket[];

  // 2. AÑADIR RELACIÓN
  @OneToMany(() => TicketTier, (ticketTier) => ticketTier.event, { cascade: true })
  ticketTiers: TicketTier[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}