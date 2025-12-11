import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from 'src/users/user.entity';

export enum PartnerStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

@Entity('partners')
export class Partner {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar' })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ type: 'varchar', nullable: true })
    logoUrl: string | null;

    @Column({ type: 'varchar', nullable: true })
    coverUrl: string | null;

    @Column({ type: 'varchar', nullable: true })
    address: string | null;

    @Column({ type: 'varchar', nullable: true })
    websiteUrl: string | null;

    @Column({ type: 'varchar', nullable: true })
    instagramUrl: string | null;

    @Column({ type: 'varchar', nullable: true })
    whatsapp: string | null;

    @Column({ type: 'varchar', nullable: true })
    category: string | null; // e.g., 'Gastronomía', 'Indumentaria'

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @Column({ type: 'enum', enum: PartnerStatus, default: PartnerStatus.APPROVED }) // Default approved for existing ones
    status: PartnerStatus;

    @OneToOne(() => User)
    @JoinColumn()
    user: User;

    @Column({ nullable: true })
    userId: string;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;
}
