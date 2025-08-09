import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Ticket } from '../tickets/ticket.entity';

export enum BirthdayBenefitType {
  GROUP_ENTRY = 'group_entry',
  CHAMPAGNE_GIFT = 'champagne_gift',
}

@Entity('birthday_benefits')
export class BirthdayBenefit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.birthdayBenefits)
  user: User;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: BirthdayBenefitType,
  })
  type: BirthdayBenefitType;

  @Column({ type: 'int' })
  year: number;

  @OneToOne(() => Ticket, { nullable: true })
  @JoinColumn()
  ticket: Ticket | null;

  @Column({ type: 'timestamp', nullable: true })
  redeemedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}