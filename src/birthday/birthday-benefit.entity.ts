// backend/src/birthday/birthday-benefit.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Column,
  JoinColumn,
  Generated,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Event } from '../events/event.entity';

@Entity('birthday_benefits')
export class BirthdayBenefit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * El UUID único para el QR de INGRESO. Indexado para búsquedas rápidas.
   */
  @Column({ type: 'uuid', unique: true })
  @Generated('uuid')
  entryQrId: string;

  /**
   * El UUID único para el QR de REGALO. Indexado para búsquedas rápidas.
   */
  @Column({ type: 'uuid', unique: true })
  @Generated('uuid')
  giftQrId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Event, { eager: true })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column()
  eventId: string;

  /**
   * Número de invitados ELEGIDO por el cliente.
   */
  @Column({ type: 'int' })
  guestLimit: number;
  
  /**
   * Contador de cuántas veces el cliente puede modificar el guestLimit.
   */
  @Column({ type: 'int', default: 2 })
  updatesRemaining: number;

  /**
   * Número EXACTO de personas reportado por el Verificador de puerta.
   */
  @Column({ type: 'int', default: 0 })
  guestsEntered: number;

  @Column({ type: 'boolean', default: false })
  isEntryClaimed: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  entryClaimedAt: Date | null;

  @Column({ type: 'boolean', default: false })
  isGiftClaimed: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  giftClaimedAt: Date | null;

  @Column({ type: 'timestamp with time zone' })
  expiresAt: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}