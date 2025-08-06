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

  @Column({ type: 'timestamp', nullable: true })
  redeemedAt: Date | null; // Se actualizará cuando el rol BARRA escanee el QR

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}