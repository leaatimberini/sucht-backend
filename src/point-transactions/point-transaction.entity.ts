// backend/src/point-transactions/point-transaction.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum PointTransactionReason {
  EVENT_ATTENDANCE = 'event_attendance',
  EVENT_NO_SHOW = 'event_no_show',
  REWARD_REDEMPTION = 'reward_redemption',
  STORE_PURCHASE = 'store_purchase',
  BIRTHDAY_BONUS = 'birthday_bonus',
  SOCIAL_SHARE = 'social_share',
  ADMIN_ADJUSTMENT = 'admin_adjustment',
}

@Entity('point_transactions')
export class PointTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: PointTransactionReason,
  })
  reason: PointTransactionReason;

  @Column({ type: 'int' })
  points: number; // Puede ser positivo (suma) o negativo (resta)

  @Column({ type: 'varchar', nullable: true })
  description: string | null; // Ej: "Asistencia al evento 'Noche de Sábado'"

  @Column({ type: 'varchar', nullable: true })
  relatedEntityId: string | null; // Ej: El ID del ticket, del premio o de la compra

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}