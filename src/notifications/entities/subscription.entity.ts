// src/notifications/entities/subscription.entity.ts

import { User } from 'src/users/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

@Entity('push_subscriptions')
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // El endpoint único que nos da el servicio de notificaciones del navegador
  @Column({ unique: true })
  endpoint: string;

  // Claves de autenticación para enviar la notificación de forma segura
  @Column()
  p256dh: string;

  @Column()
  auth: string;

  // Relación: Muchas suscripciones pueden pertenecer a un usuario
  @ManyToOne(() => User, user => user.pushSubscriptions, { onDelete: 'CASCADE' })
  user: User;
}