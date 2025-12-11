
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { MarketingAccount } from './marketing-account.entity';
import { AdSet } from './ad-set.entity';

@Entity('marketing_campaigns')
export class Campaign {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    externalId: string; // ID on Meta/Google

    @Column()
    name: string;

    @Column()
    status: string; // ACTIVE, PAUSED, ARCHIVED

    @Column()
    objective: string; // OUTCOME_TRAFFIC, OUTCOME_SALES, etc.

    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    totalBudget: number;

    @Column({ default: 'LIFETIME' })
    budgetType: string; // 'DAILY' or 'LIFETIME'

    @ManyToOne(() => MarketingAccount, (account) => account.campaigns)
    account: MarketingAccount;

    @OneToMany(() => AdSet, (adSet) => adSet.campaign, { cascade: true, onDelete: 'CASCADE' })
    adSets: AdSet[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
