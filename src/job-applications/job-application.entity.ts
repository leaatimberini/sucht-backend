import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum JobApplicationStatus {
    PENDING = 'pending',
    REVIEWED = 'reviewed',
    CONTACTED = 'contacted',
    REJECTED = 'rejected',
}

@Entity('job_applications')
export class JobApplication {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    fullName: string;

    @Column()
    email: string;

    @Column()
    phone: string;

    @Column({ nullable: true })
    position: string;

    @Column({ nullable: true })
    instagram: string;

    @Column()
    cvUrl: string;

    @Column({ type: 'text', nullable: true })
    message: string;

    @Column({
        type: 'enum',
        enum: JobApplicationStatus,
        default: JobApplicationStatus.PENDING,
    })
    status: JobApplicationStatus;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
