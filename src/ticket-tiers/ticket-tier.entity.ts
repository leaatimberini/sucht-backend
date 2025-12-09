// src/ticket-tiers/ticket-tier.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Event } from '../events/event.entity';
import { Reward } from '../rewards/reward.entity';

export enum ProductType {
  TICKET = 'ticket',
  VIP_TABLE = 'vip_table',
  VOUCHER = 'voucher',
}

@Entity('ticket_tiers')
export class TicketTier {
  // ... (todas las demás columnas como id, eventId, name, price, etc.)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  eventId: string;

  @ManyToOne(() => Event, (event) => event.ticketTiers, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'timestamp', nullable: true })
  validUntil: Date | null;

  @Column({ default: false })
  isFree: boolean;

  @Column({
    type: 'enum',
    enum: ProductType,
    default: ProductType.TICKET,
  })
  productType: ProductType;

  @Column({ type: 'integer', nullable: true })
  tableNumber: number | null;

  @Column({ type: 'integer', nullable: true })
  capacity: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string | null;

  @Column({ default: false })
  allowPartialPayment: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  partialPaymentPrice: number | null;

  @Column({ default: false })
  isBirthdayDefault: boolean;

  @Column({ default: false })
  isBirthdayVipOffer: boolean;

  @Column({ default: false })
  isVip: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  consumptionCredit: number | null;

  // --- NUEVA COLUMNA AÑADIDA ---
  @Column({ type: 'boolean', default: true })
  isPubliclyListed: boolean;

  // --- RELACIÓN CON PRODUCTO/PREMIO ---
  @Column({ nullable: true })
  linkedRewardId: string | null;

  @ManyToOne(() => Reward, { nullable: true, eager: true })
  @JoinColumn({ name: 'linkedRewardId' })
  linkedReward: Reward | null;

  @Column({ nullable: true })
  tableCategoryId: string | null;

  @ManyToOne('TableCategory', { nullable: true }) // Using string to avoid circular dependency import issues if any
  @JoinColumn({ name: 'tableCategoryId' })
  tableCategory: any | null; // Typed as any to avoid import for now, or import properly if possible. Checks imports.

  // --- FIN RELACIÓN ---
  // --- FIN DE NUEVA COLUMNA ---

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}