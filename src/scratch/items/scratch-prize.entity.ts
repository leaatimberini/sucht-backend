import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Partner } from '../../partners/partner.entity';
import { Product } from '../../store/product.entity';
import { Reward } from '../../rewards/reward.entity';

export enum ScratchPrizeType {
    INTERNAL = 'INTERNAL',
    PARTNER = 'PARTNER',
    NO_WIN = 'NO_WIN' // Siga Participando
}

@Entity('scratch_prizes')
export class ScratchPrize {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'enum', enum: ScratchPrizeType, default: ScratchPrizeType.INTERNAL })
    type: ScratchPrizeType;

    @Column({ type: 'varchar' })
    name: string; // "Trago Gratis" o "20% Off en X"

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'varchar', nullable: true })
    imageUrl: string;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    probability: number; // Porcentaje 0.00 a 100.00

    @Column({ type: 'int', default: 0 })
    stock: number; // Configurable stock. -1 para infinito? Mejor usar 999999

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @Column({ nullable: true })
    partnerId: string;

    @ManyToOne(() => Partner, { nullable: true })
    @JoinColumn({ name: 'partnerId' })
    partner: Partner;

    @Column({ nullable: true })
    productId: string;

    @ManyToOne(() => Product, { nullable: true })
    @JoinColumn({ name: 'productId' })
    product: Product;

    @Column({ nullable: true })
    rewardId: string;

    @ManyToOne(() => Reward, { nullable: true })
    @JoinColumn({ name: 'rewardId' })
    reward: Reward;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;
}
