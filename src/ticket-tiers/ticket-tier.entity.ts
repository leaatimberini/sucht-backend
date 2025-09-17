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

export enum ProductType {
  TICKET = 'ticket',
  VIP_TABLE = 'vip_table',
  VOUCHER = 'voucher',
}

@Entity('ticket_tiers')
export class TicketTier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  eventId: string; // ID explícito para la relación

  @ManyToOne(() => Event, (event) => event.ticketTiers, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'eventId' }) // Define la columna de la clave foránea
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
  
  // --- CAMPOS AÑADIDOS PARA GESTIÓN DE MESAS VIP ---
  @Column({ type: 'integer', nullable: true })
  tableNumber: number | null; // El número que aparece en tu mapa

  @Column({ type: 'integer', nullable: true })
  capacity: number | null; // Cantidad de personas que incluye la mesa

  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string | null; // Ej: "Sector VIP", "Cabina"
  // --- FIN DE CAMPOS AÑADIDOS ---

  @Column({ default: false })
  allowPartialPayment: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  partialPaymentPrice: number | null;

  @Column({ default: false })
  isBirthdayDefault: boolean;

  @Column({ default: false })
  isBirthdayVipOffer: boolean;

  @Column({ default: false })
  isVip: boolean; // Columna para identificar entradas VIP

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  consumptionCredit: number | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}