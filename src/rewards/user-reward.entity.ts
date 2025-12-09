// src/rewards/user-reward.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Reward } from './reward.entity';
import { Ticket } from '../tickets/ticket.entity';

@Entity('user_rewards')
export class UserReward {
  @PrimaryGeneratedColumn('uuid')
  id: string; // Este ID único se codificará en el QR

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Reward)
  reward: Reward;

  @Column()
  rewardId: string;

  // --- RELACIÓN CON TICKET (OPCIONAL) ---
  @ManyToOne(() => Ticket, (ticket) => ticket.userRewards, { nullable: true })
  ticket: Ticket | null;

  @Column({ nullable: true })
  ticketId: string | null;
  // --- FIN RELACIÓN ---

  @Column({ type: 'timestamp', nullable: true })
  redeemedAt: Date | null;

  /**
   * NUEVA COLUMNA: Indica el origen del premio (ej. 'BIRTHDAY', 'LOYALTY').
   * Nos permitirá filtrar y hacer seguimiento.
   */
  @Column({ type: 'varchar', nullable: true })
  origin: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}