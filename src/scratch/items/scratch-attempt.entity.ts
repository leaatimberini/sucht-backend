import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from 'src/users/user.entity';
import { ScratchPrize } from './scratch-prize.entity';

@Entity('scratch_attempts')
export class ScratchAttempt {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @CreateDateColumn({ type: 'timestamp' })
    playedAt: Date;

    @Column({ type: 'boolean' })
    didWin: boolean;

    @Column({ nullable: true })
    prizeId: string;

    @ManyToOne(() => ScratchPrize, { nullable: true })
    @JoinColumn({ name: 'prizeId' })
    prize: ScratchPrize;

    @Column({ type: 'boolean', default: false })
    claimed: boolean; // Si ganó y ya usó el premio (opcional dependiedo de si generamos UserReward directo)
}
