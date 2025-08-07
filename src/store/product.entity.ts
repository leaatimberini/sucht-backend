import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string; // Ej: "Botella de Absolut Vodka"

  @Column({ type: 'text', nullable: true })
  description: string | null; // Ej: "Incluye 4 latas de Speed"

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number; // Precio de venta anticipado

  @Column({ type: 'int', nullable: true })
  stock: number | null; // Cantidad disponible por evento. Si es null, es ilimitado.

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null; // URL de una imagen para el producto

  @Column({ type: 'boolean', default: true })
  isActive: boolean; // Para habilitar/deshabilitar productos de la tienda

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}