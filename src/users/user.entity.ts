// backend/src/users/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert, OneToMany } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Ticket } from 'src/tickets/ticket.entity';
import { PushSubscription } from 'src/notifications/entities/subscription.entity';
import { Notification } from 'src/notifications/entities/notification.entity';

export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  RRPP = 'rrpp',
  VERIFIER = 'verifier',
  CLIENT = 'client',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  username: string | null;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true, select: false }) // select: false para seguridad
  password?: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({
    type: 'simple-array',
    default: [UserRole.CLIENT],
  })
  roles: UserRole[];

  @Column({ type: 'varchar', nullable: true, select: false }) // select: false para seguridad
  invitationToken: string | null;

  @Column({ type: 'varchar', nullable: true })
  profileImageUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  instagramHandle: string | null;

  @Column({ type: 'varchar', nullable: true })
  whatsappNumber: string | null;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date | null;

  @Column({ type: 'varchar', nullable: true, select: false }) // select: false para seguridad
  mpAccessToken: string | null;

  @Column({ type: 'bigint', nullable: true })
  mpUserId: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  rrppCommissionRate: number | null;

  // ==========================================================
  // ===== NUEVA COLUMNA PARA EL SISTEMA DE PUNTOS =====
  // ==========================================================
  @Column({ type: 'int', default: 0 })
  points: number;

  @OneToMany(() => Ticket, (ticket) => ticket.user)
  tickets: Ticket[];

  @OneToMany(() => Ticket, (ticket) => ticket.promoter)
  promotedTickets: Ticket[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @BeforeInsert()
  async hashPassword() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  @OneToMany(() => Notification, notification => notification.user)
  notifications: Notification[];

  @OneToMany(() => PushSubscription, (subscription) => subscription.user)
  pushSubscriptions: PushSubscription[];
}