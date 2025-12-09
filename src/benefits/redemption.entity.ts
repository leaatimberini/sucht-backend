import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Benefit } from './benefit.entity';
import { User } from 'src/users/user.entity';

export enum RedemptionStatus {
    PENDING = 'pending',
    REDEEMED = 'redeemed',
    EXPIRED = 'expired',
}

@Entity('redemptions')
export class Redemption {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Benefit, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'benefitId' })
    benefit: Benefit;

    @Column()
    benefitId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    userId: string;

    @Column({ type: 'varchar', unique: true })
    code: string; // The unique alphanumeric code

    @Column({ type: 'enum', enum: RedemptionStatus, default: RedemptionStatus.PENDING })
    status: RedemptionStatus;

    @Column({ type: 'timestamp', nullable: true })
    redeemedAt: Date | null;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;
}
