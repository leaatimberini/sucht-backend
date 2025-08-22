import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, Column } from 'typeorm';
import { Raffle } from './raffle.entity';
import { User } from '../users/user.entity';
import { RafflePrize } from './raffle-prize.entity';

@Entity('raffle_winners')
export class RaffleWinner {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Raffle, raffle => raffle.winners, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'raffleId' })
    raffle: Raffle;

    @Column()
    raffleId: string;

    @ManyToOne(() => User, { eager: true })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    userId: string;

    @ManyToOne(() => RafflePrize, { eager: true })
    @JoinColumn({ name: 'prizeId' })
    prize: RafflePrize;

    @Column()
    prizeId: string;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;
}