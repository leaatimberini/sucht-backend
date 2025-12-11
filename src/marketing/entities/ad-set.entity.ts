
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { Campaign } from './campaign.entity';
import { AdCreative } from './ad-creative.entity';

@Entity('marketing_ad_sets')
export class AdSet {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    externalId: string;

    @Column()
    name: string;

    @Column()
    status: string;

    @Column('jsonb', { nullable: true })
    targeting: any; // JSON object storing audience targeting rules

    @Column({ nullable: true })
    startTime: Date;

    @Column({ nullable: true })
    endTime: Date;

    @ManyToOne(() => Campaign, (campaign) => campaign.adSets)
    campaign: Campaign;

    @OneToMany(() => AdCreative, (ad) => ad.adSet, { cascade: true, onDelete: 'CASCADE' })
    ads: AdCreative[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
