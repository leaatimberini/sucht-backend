import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Partner } from './partner.entity';

@Entity('partner_views')
export class PartnerView {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Partner, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'partnerId' })
    partner: Partner;

    @Column()
    partnerId: string;

    @Column({ type: 'varchar', nullable: true })
    userId: string | null; // Nullable for anonymous views if we allow them, or logged in users

    @CreateDateColumn({ type: 'timestamp' })
    viewedAt: Date;
}
