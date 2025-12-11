
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { AdSet } from './ad-set.entity';

@Entity('marketing_ad_creatives')
export class AdCreative {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    externalId: string;

    @Column()
    name: string;

    @Column()
    status: string;

    @Column({ nullable: true })
    imgUrl: string;

    @Column({ type: 'text', nullable: true })
    bodyText: string;

    @Column({ nullable: true })
    headline: string;

    // --- Performance Metrics (Cached) ---
    @Column({ type: 'float', default: 0 })
    spend: number;

    @Column({ type: 'int', default: 0 })
    impressions: number;

    @Column({ type: 'int', default: 0 })
    clicks: number;

    @Column({ type: 'float', default: 0 })
    ctr: number;

    @Column({ type: 'float', default: 0 })
    roas: number;


    @ManyToOne(() => AdSet, (adSet) => adSet.ads)
    adSet: AdSet;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
