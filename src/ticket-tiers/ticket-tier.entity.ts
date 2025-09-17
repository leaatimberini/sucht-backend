// src/ticket-tiers/ticket-tier.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn, // Importante añadir JoinColumn para ser explícitos
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
  eventId: string; // Es buena práctica tener el ID de la relación explícito

  @ManyToOne(() => Event, (event) => event.ticketTiers, {
    onDelete: 'CASCADE',
    nullable: false, // Una entrada siempre debe pertenecer a un evento
  })
  @JoinColumn({ name: 'eventId' }) // Le decimos a TypeORM dónde está la clave foránea
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
  tableNumber: number | null; // El número que aparece en tu mapa (1, 2, 3...)

  @Column({ type: 'integer', nullable: true })
  capacity: number | null; // Cantidad de personas que incluye la mesa

  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string | null; // Ej: "Sector VIP", "Cabina", "Mesas Pista"
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
  isVip: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  consumptionCredit: number | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}