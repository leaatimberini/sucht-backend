import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert, BeforeUpdate, OneToMany } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Ticket } from 'src/tickets/ticket.entity';
import { PushSubscription } from 'src/notifications/entities/subscription.entity';
import { Notification } from 'src/notifications/entities/notification.entity';
import { UserReward } from 'src/rewards/user-reward.entity';
import { ProductPurchase } from 'src/store/product-purchase.entity';

// Se añade el nuevo rol 'ORGANIZER'
export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  ORGANIZER = 'organizer', // <-- NUEVO ROL
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
  name: string;

  // El campo de la contraseña no se seleccionará por defecto en las consultas
  @Column({ select: false, nullable: true })
  password?: string;
  
  @Column({ type: 'simple-array', default: UserRole.CLIENT })
  roles: UserRole[];

  @Column({ nullable: true })
  profileImageUrl: string;
  
  @Column({ nullable: true })
  instagramHandle: string;

  @Column({ nullable: true })
  whatsappNumber: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date;

  // Credenciales de Mercado Pago (pueden ser nulas)
  @Column({ nullable: true, select: false })
  mpAccessToken?: string;

  @Column({ nullable: true })
  mpUserId?: number;
  
  // Token para usuarios invitados que aún no han establecido su contraseña
  @Column({ nullable: true, select: false })
  invitationToken?: string;
  
  // Comisión por venta para RRPP
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.0, nullable: true })
  rrppCommissionRate: number;
  
  // Puntos de lealtad
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


  // Hooks para hashear la contraseña antes de guardarla
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }
}