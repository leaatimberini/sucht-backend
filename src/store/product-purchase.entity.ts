import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Product } from './product.entity';
import { Event } from '../events/event.entity';

@Entity('product_purchases')
export class ProductPurchase {
  @PrimaryGeneratedColumn('uuid')
  id: string; // Este ID único se codificará en el QR

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Product)
  product: Product;

  @Column()
  productId: string;

  // Vinculamos la compra a un evento específico
  @ManyToOne(() => Event)
  event: Event;

  @Column()
  eventId: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amountPaid: number;

  @Column({ type: 'varchar' })
  paymentId: string; // ID del pago de Mercado Pago

  @Column({ type: 'timestamp', nullable: true })
  redeemedAt: Date | null; // Se actualizará cuando el rol BARRA escanee el QR

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}