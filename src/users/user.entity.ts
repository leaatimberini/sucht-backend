import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert, BeforeUpdate, OneToMany } from 'typeorm';
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
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  username: string;



  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  name: string | null;

  @Column({ select: false, nullable: true })
  password?: string;
  
  @Column({ type: 'simple-array', default: UserRole.CLIENT })
  roles: UserRole[];

  @Column({ nullable: true })
  profileImageUrl: string | null;
  
  @Column({ nullable: true })
  instagramHandle: string | null;

  @Column({ nullable: true })
  whatsappNumber: string | null;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date | null;

  @Column({ nullable: true, select: false })
  mpAccessToken?: string | null;

  @Column({ type: 'integer', nullable: true })
  mpUserId?: number | null;
  
  @Column({ nullable: true, select: false })
  invitationToken?: string | null;
  
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.0, nullable: true })
  rrppCommissionRate: number | null;
  
  @Column({ type: 'int', default: 0 })
  points: number;
  
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
  
  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  // Relaciones
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

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }
}