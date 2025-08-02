// backend/src/users/user.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  OneToMany,
} from 'typeorm';
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
  username: string;

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
  invitationToken: string;

  @Column({ nullable: true })
  profileImageUrl: string;

  @Column({ nullable: true })
  instagramHandle: string;

  @Column({ nullable: true })
  whatsappNumber: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date;

  // --- NUEVOS CAMPOS PARA PAGOS ---
  // CORRECCIÓN: Cambiamos el nombre de la propiedad a 'mpAccessToken'
  @Column({ nullable: true, select: false })
  mpAccessToken: string;

  // NUEVO CAMPO: Agregamos el mpUserId para el split de pagos
  @Column({ nullable: true, select: false })
  mpUserId: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  rrppCommissionRate: number;

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