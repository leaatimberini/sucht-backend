import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Raffle } from './raffle.entity';
import { Product } from '../store/product.entity';

@Entity('raffle_prizes')
export class RafflePrize {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Raffle, raffle => raffle.prizes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'raffleId' })
    raffle: Raffle;

    @Column()
    raffleId: string;

    @ManyToOne(() => Product, { eager: true })
    @JoinColumn({ name: 'productId' })
    product: Product;

    @Column()
    productId: string;

    @Column({ type: 'int' })
    prizeRank: number; // ej. 1 para el 1er lugar, 2 para el 2do
}