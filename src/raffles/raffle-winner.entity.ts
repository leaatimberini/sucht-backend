import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Column,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Event } from '../events/event.entity';
import { ProductPurchase } from '../store/product-purchase.entity';

@Entity('raffle_winners')
export class RaffleWinner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * El usuario que ganó el sorteo.
   */
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'winnerUserId' })
  winner: User;

  @Column()
  winnerUserId: string;

  /**
   * El evento para el cual se realizó este sorteo.
   */
  @ManyToOne(() => Event, { eager: true })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column()
  eventId: string;

  /**
   * El registro de la "compra gratuita" del producto que se ganó.
   * A través de esta relación, sabemos qué premio fue y si ya fue canjeado (`redeemedAt`).
   */
  @ManyToOne(() => ProductPurchase, { eager: true })
  @JoinColumn({ name: 'prizePurchaseId' })
  prize: ProductPurchase;

  @Column()
  prizePurchaseId: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  drawnAt: Date; // Fecha y hora en que se realizó el sorteo
}