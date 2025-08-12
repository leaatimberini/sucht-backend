// src/ticket-tiers/ticket-tier.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
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
  
  @Column({ default: false })
  isFree: boolean;

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

  // --- NUEVOS CAMPOS PARA EL MÓDULO DE CUMPLEAÑOS ---

  /**
   * Si es 'true', este es el TicketTier gratuito que se asignará
   * por defecto en la opción "Clásica" del beneficio de cumpleaños.
   * Solo puede haber uno por evento.
   */
  @Column({ default: false })
  isBirthdayDefault: boolean;

  /**
   * Si es 'true', este es el TicketTier (ej. Mesa VIP) que se ofrecerá
   * como 'Upgrade' en el beneficio de cumpleaños.
   * Solo puede haber uno por evento.
   */
  @Column({ default: false })
  isBirthdayVipOffer: boolean;
  
  /**
   * Define el crédito en consumo para productos como Mesas VIP.
   * Para la oferta de cumpleaños, aquí iría el valor promocional (ej. 200000).
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  consumptionCredit: number | null;

  // --- FIN DE NUEVOS CAMPOS ---

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}