
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne } from 'typeorm';
import { Campaign } from './campaign.entity';

@Entity('marketing_optimization_logs')
export class OptimizationLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Campaign, { onDelete: 'CASCADE' })
    campaign: Campaign;

    @Column({ nullable: true })
    campaignId: string;

    @Column({ type: 'jsonb' })
    currentMetrics: {
        spend: number;
        impressions: number;
        cpm: number;
        ctr: number;
        roas: number;
    };

    @Column()
    aiDecision: 'SCALE_UP' | 'PAUSE' | 'LOWER_BUDGET' | 'MAINTAIN';

    @Column()
    reasoning: string;

    @Column({ nullable: true })
    actionTaken: string; // "Paused AdSet X", "Increased Budget by 20%"

    @Column({ type: 'varchar', nullable: true })
    pendingAction: string | null;

    @Column({ type: 'varchar', nullable: true })
    uploadToken: string | null;

    @CreateDateColumn()
    createdAt: Date;
}
