// src/events/event.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { User } from 'src/users/user.entity';
import { TicketTier } from 'src/tickets/ticket-tier.entity';
import { EventStatus } from 'src/events/enums/event-status.enum';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  flyerUrl: string;

  @Column({ nullable: true })
  location: string;

  @Column({ type: 'timestamp', nullable: true })
  date: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.DRAFT,
  })
  status: EventStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.events, { eager: true })
  owner: User;

  @OneToMany(() => TicketTier, (ticketTier) => ticketTier.event, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  ticketTiers: TicketTier[];
}