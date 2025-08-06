import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

// Se crea un nuevo Enum para los lugares de canje
export enum RewardRedemptionLocation {
  DOOR = 'door', // Para canjes en la puerta (ej: una entrada gratis)
  BAR = 'bar',   // Para canjes en la barra (ej: un trago)
}

@Entity('rewards')
export class Reward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int' })
  pointsCost: number;

  @Column({ type: 'int', nullable: true })
  stock: number | null;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // ===== NUEVO CAMPO PARA UBICACIÓN DE CANJE =====
  @Column({
    type: 'enum',
    enum: RewardRedemptionLocation,
    default: RewardRedemptionLocation.BAR, // Por defecto, los premios se canjean en la barra
  })
  redemptionLocation: RewardRedemptionLocation;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}