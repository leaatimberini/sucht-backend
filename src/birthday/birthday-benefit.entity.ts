// backend/src/birthday/birthday-benefit.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Column,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Event } from '../events/event.entity'; // Importamos la entidad Event

@Entity('birthday_benefits')
export class BirthdayBenefit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * El usuario que recibe el beneficio de cumpleaños.
   */
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  /**
   * El evento para el cual este beneficio es válido.
   */
  @ManyToOne(() => Event, { eager: true })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column()
  eventId: string;

  /**
   * Descripción del beneficio (ej: "Acceso gratuito + 1 Champagne").
   */
  @Column({ type: 'varchar', default: 'Beneficio de Cumpleaños' })
  description: string;

  /**
   * Número MÁXIMO de invitados permitidos, además del cumpleañero.
   * Este es el valor que el Admin podrá modificar.
   */
  @Column({ type: 'int', default: 10 })
  guestLimit: number;

  /**
   * Número EXACTO de personas (cumpleañero + invitados) que ingresaron,
   * según lo reportado por el Verificador. Es clave para el aforo.
   */
  @Column({ type: 'int', default: 0 })
  guestsEntered: number;

  /**
   * Indica si el beneficio de INGRESO ya fue canjeado en la puerta.
   */
  @Column({ type: 'boolean', default: false })
  isEntryClaimed: boolean;

  /**
   * Fecha y hora en la que se canjeó el INGRESO.
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  entryClaimedAt: Date | null;

  /**
   * Indica si el beneficio de REGALO (ej. champagne) ya fue canjeado en la barra.
   */
  @Column({ type: 'boolean', default: false })
  isGiftClaimed: boolean;

  /**
   * Fecha y hora en la que se canjeó el REGALO.
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  giftClaimedAt: Date | null;

  /**
   * Fecha hasta la cual el beneficio es válido para ser reclamado.
   */
  @Column({ type: 'timestamp with time zone' })
  expiresAt: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}