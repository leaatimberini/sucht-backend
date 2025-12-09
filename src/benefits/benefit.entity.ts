import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Partner } from 'src/partners/partner.entity';

@Entity('benefits')
export class Benefit {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar' })
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ type: 'text', nullable: true })
    conditions: string | null;

    @Column({ type: 'varchar', nullable: true })
    imageUrl: string | null;

    @Column({ type: 'timestamp', nullable: true })
    validFrom: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    validUntil: Date | null;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @ManyToOne(() => Partner, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'partnerId' })
    partner: Partner;

    @Column()
    partnerId: string;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;
}
