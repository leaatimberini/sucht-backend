// src/tickets/ticket.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    AfterLoad,
    BeforeInsert,
    BeforeUpdate,
    Relation,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Event } from '../events/event.entity';
import { TicketTier } from 'src/ticket-tiers/ticket-tier.entity';

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

    // ❌ CORRECCIÓN: Eliminamos la columna isVipAccess
    // @Column({ type: 'boolean', default: false })
    // isVipAccess: boolean;

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

    // ❌ CORRECCIÓN: Añadimos una propiedad virtual para mantener la funcionalidad
    // Esto se ejecutará cada vez que se cargue un ticket de la base de datos
    isVipAccess: boolean;
    @AfterLoad()
    setVipAccess() {
        this.isVipAccess = this.tier?.isVip ?? false;
    }
}