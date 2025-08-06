import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('rewards')
export class Reward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string; // Ej: "Trago Gratis a Elección"

  @Column({ type: 'text', nullable: true })
  description: string | null; // Ej: "Canjea tus puntos por cualquier trago de la carta."

  @Column({ type: 'int' })
  pointsCost: number; // Ej: 500

  @Column({ type: 'int', nullable: true })
  stock: number | null; // Cantidad disponible. Si es null, es ilimitado.

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null; // URL de una imagen para el premio

  @Column({ type: 'boolean', default: true })
  isActive: boolean; // Un interruptor para habilitar/deshabilitar premios individuales

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}