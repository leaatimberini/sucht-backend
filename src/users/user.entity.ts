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

  @Column({ unique: true, nullable: true })
  username: string | null;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password?: string;

  @Column()
  name: string;

  @Column({
    type: 'simple-array',
    default: [UserRole.CLIENT],
  })
  roles: UserRole[];

  @Column({ nullable: true })
  invitationToken: string | null;

  @Column({ nullable: true })
  profileImageUrl: string | null;

  @Column({ nullable: true })
  instagramHandle: string | null;

  @Column({ nullable: true })
  whatsappNumber: string | null;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date | null;

  // --- CAMPOS PARA PAGOS CORREGIDOS ---
  // CORRECCIÓN FINAL: Se añade type: 'varchar' para ser explícitos
  @Column({ type: 'varchar', nullable: true })
  mpAccessToken: string | null;

  @Column({ type: 'bigint', nullable: true })
  mpUserId: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  rrppCommissionRate: number | null;

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