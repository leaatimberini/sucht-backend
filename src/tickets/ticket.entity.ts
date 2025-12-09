// src/tickets/ticket.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    AfterLoad,
    Relation,
    OneToMany,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Event } from '../events/event.entity';
import { TicketTier } from 'src/ticket-tiers/ticket-tier.entity';
import { UserReward } from 'src/rewards/user-reward.entity';

export enum TicketStatus {
    VALID = 'valid',
    USED = 'used',
    PARTIALLY_USED = 'partially_used',
    INVALIDATED = 'invalidated',
    PARTIALLY_PAID = 'partially_paid',
    REDEEMED = 'redeemed',
}

@Entity('tickets')
export class Ticket {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, (user) => user.tickets, { eager: true })
    user: User;

    @ManyToOne(() => Event, (event) => event.tickets, { eager: true })
    event: Event;

    @ManyToOne(() => TicketTier, { eager: true })
    tier: Relation<TicketTier>;

    @OneToMany(() => UserReward, (userReward) => userReward.ticket, { eager: true })
    userRewards: UserReward[];

    @ManyToOne(() => User, (user) => user.promotedTickets, {
        nullable: true,
        eager: true,
    })
    promoter: User | null;

    @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.VALID })
    status: TicketStatus;

    @Column({ type: 'varchar', nullable: true })
    origin: string | null;

    @Column({ type: 'int', default: 1 })
    quantity: number;

    @Column({ type: 'int', default: 0 })
    redeemedCount: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
    amountPaid: number;

    @Column({ type: 'varchar', nullable: true, unique: true })
    paymentId: string | null;

    @Column({ type: 'varchar', nullable: true })
    specialInstructions: string | null;

    @Column({ type: 'timestamp', nullable: true })
    confirmedAt: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    validatedAt: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    reminderSentAt?: Date;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;

    // --- VIP ACCESS LOGIC ---
    // Esta propiedad no existe en la base de datos, es un campo "virtual".
    isVipAccess: boolean;

    // Este decorador se ejecuta automáticamente cada vez que se carga un Ticket desde la BD.
    // Su función es leer si el "tier" asociado es VIP y asignar el valor a la
    // propiedad virtual isVipAccess.
    @AfterLoad()
    setVipAccess() {
        this.isVipAccess = this.tier?.isVip ?? false;
    }
    // --- FIN DE VIP ACCESS LOGIC ---
}