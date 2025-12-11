
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Campaign } from './campaign.entity';

@Entity('marketing_accounts')
export class MarketingAccount {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    platform: 'META' | 'GOOGLE'; // Platform identifier

    @Column()
    name: string; // User-friendly name (e.g., "Sucht Instagram")

    @Column()
    accountId: string; // External ID (Ad Account ID)

    @Column({ default: 'USD' })
    currency: string; // 'USD', 'ARS', etc.

    @Column({ nullable: true })
    accessToken: string; // OAuth Access Token (Consider encryption for prod)

    @Column({ nullable: true })
    refreshToken: string; // OAuth Refresh Token (if applicable)

    @Column({ type: 'timestamp', nullable: true })
    tokenExpiresAt: Date;

    @Column({ default: true })
    isActive: boolean;

    @OneToMany(() => Campaign, (campaign) => campaign.account)
    campaigns: Campaign[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
