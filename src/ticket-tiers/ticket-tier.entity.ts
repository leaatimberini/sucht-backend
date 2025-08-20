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
  
  @Column({ default: false })
  isBirthdayDefault: boolean;

  @Column({ default: false })
  isBirthdayVipOffer: boolean;
  
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  consumptionCredit: number | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}