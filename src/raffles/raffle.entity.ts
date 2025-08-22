import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Event } from '../events/event.entity';
import { RafflePrize } from './raffle-prize.entity';
import { RaffleWinner } from './raffle-winner.entity';

export enum RaffleStatus {
    PENDING = 'pending',
    COMPLETED = 'completed',
}

@Entity('raffles')
export class Raffle {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToOne(() => Event, event => event.raffle)
    @JoinColumn({ name: 'eventId' })
    event: Event;

    @Column({ unique: true })
    eventId: string;

    @Column({ type: 'timestamp with time zone' })
    drawDate: Date;

    @Column({ type: 'int', default: 1 })
    numberOfWinners: number;

    @Column({
        type: 'enum',
        enum: RaffleStatus,
        default: RaffleStatus.PENDING,
    })
    status: RaffleStatus;

    @OneToMany(() => RafflePrize, prize => prize.raffle, { cascade: true })
    prizes: RafflePrize[];

    @OneToMany(() => RaffleWinner, winner => winner.raffle)
    winners: RaffleWinner[];

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;
}