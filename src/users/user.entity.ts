// src/users/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert, OneToMany } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Ticket } from 'src/tickets/ticket.entity';
import { PushSubscription } from 'src/notifications/entities/subscription.entity';
import { Notification } from 'src/notifications/entities/notification.entity';
import { UserReward } from 'src/rewards/user-reward.entity';
import { ProductPurchase } from 'src/store/product-purchase.entity';

export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  ORGANIZER = 'organizer',
  RRPP = 'rrpp',
  VERIFIER = 'verifier',
  BARRA = 'barra',
  CLIENT = 'client',
  PARTNER = 'partner',
}

export enum GoogleReviewStatus {
  NONE = 'NONE',
  PENDING_VALIDATION = 'PENDING_VALIDATION',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  username: string | null;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  name: string | null;

  @Column({ select: false, nullable: true })
  password?: string;

  @Column({ type: 'enum', enum: UserRole, array: true, default: [UserRole.CLIENT] })
  roles: UserRole[];

  @Column({ type: 'varchar', nullable: true })
  profileImageUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  instagramHandle: string | null;

  @Column({ type: 'varchar', nullable: true })
  whatsappNumber: string | null;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date | null;

  @Column({ type: 'varchar', nullable: true, select: false })
  mpAccessToken?: string | null;

  @Column({ type: 'integer', nullable: true })
  mpUserId?: number | null;

  @Column({ type: 'varchar', nullable: true, select: false })
  taloAccessToken?: string | null;

  @Column({ type: 'varchar', nullable: true, select: false })
  taloRefreshToken?: string | null;

  @Column({ type: 'varchar', nullable: true })
  taloUserId?: string | null;

  @Column({ type: 'varchar', length: 22, nullable: true })
  cbu: string | null;

  @Column({ type: 'varchar', nullable: true, select: false })
  invitationToken?: string | null;

  @Column({ type: 'varchar', nullable: true, select: false })
  passwordResetToken?: string | null;

  @Column({ type: 'timestamp', nullable: true, select: false })
  passwordResetExpires?: Date | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.0, nullable: true })
  rrppCommissionRate: number | null;

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ type: 'enum', enum: GoogleReviewStatus, default: GoogleReviewStatus.NONE })
  googleReviewStatus: GoogleReviewStatus;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @OneToMany(() => Ticket, ticket => ticket.user)
  tickets: Ticket[];

  @OneToMany(() => Ticket, ticket => ticket.promoter)
  promotedTickets: Ticket[];

  @OneToMany(() => PushSubscription, subscription => subscription.user)
  pushSubscriptions: PushSubscription[];

  @OneToMany(() => Notification, notification => notification.user)
  notifications: Notification[];

  @OneToMany(() => UserReward, userReward => userReward.user)
  rewards: UserReward[];

  @OneToMany(() => ProductPurchase, purchase => purchase.user)
  purchases: ProductPurchase[];

  // FIX: Se elimina @BeforeUpdate. La encriptación en actualizaciones
  // ahora es responsabilidad del UsersService.
  @BeforeInsert()
  async hashPassword() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }
}