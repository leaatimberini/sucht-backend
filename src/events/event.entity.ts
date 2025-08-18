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

  @Column({ type: 'timestamp with time zone' }) // Se recomienda usar 'with time zone'
  startDate: Date;

  @Column({ type: 'timestamp with time zone' })
  endDate: Date;

  @Column({ nullable: true })
  flyerImageUrl: string;

  @Column({ type: 'timestamp', nullable: true })
  confirmationSentAt: Date | null;

  // --- NUEVOS CAMPOS PARA PUBLICACIÓN PROGRAMADA ---

  /**
   * Si es 'true', el evento es visible para el público en general.
   */
  @Column({ type: 'boolean', default: false })
  isPublished: boolean;

  /**
   * La fecha y hora en que el evento se publicará automáticamente.
   * Si es nulo, se debe publicar manualmente.
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  publishAt: Date | null;

  // --- FIN DE NUEVOS CAMPOS ---

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