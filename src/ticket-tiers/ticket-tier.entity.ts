import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Event } from '../events/event.entity';

// --- NUEVO ENUM PARA TIPOS DE PRODUCTO ---
export enum ProductType {
  TICKET = 'ticket',
  VIP_TABLE = 'vip_table',
  VOUCHER = 'voucher',
}

@Entity('ticket_tiers')
export class TicketTier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Event, (event) => event.ticketTiers, {
    onDelete: 'CASCADE',
  })
  event: Event;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'timestamp', nullable: true })
  validUntil: Date | null;

  // --- NUEVOS CAMPOS PARA PRODUCTOS AVANZADOS ---

  @Column({
    type: 'enum',
    enum: ProductType,
    default: ProductType.TICKET,
  })
  productType: ProductType;

  @Column({ default: false })
  allowPartialPayment: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  partialPaymentPrice: number | null;

  // --- FIN DE NUEVOS CAMPOS ---

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}