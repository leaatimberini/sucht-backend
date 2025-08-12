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

  @ManyToOne(() => Event)
  event: Event;

  @Column()
  eventId: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amountPaid: number;

  @Column({ type: 'varchar', nullable: true }) // Se hace nullable para regalos
  paymentId: string | null;

  /**
   * NUEVA COLUMNA: Indica el origen de la compra (ej. 'OWNER_GIFT', 'PURCHASE').
   */
  @Column({ type: 'varchar', nullable: true })
  origin: string | null;

  @Column({ type: 'timestamp', nullable: true })
  redeemedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}