import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('configurations')
export class Configuration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Usaremos una clave única para encontrar fácilmente la configuración
  // Ejemplo: 'adminServiceFee'
  @Column({ unique: true })
  key: string; 

  // Guardaremos el valor como texto para máxima flexibilidad
  // Ejemplo: '2.5' para una tarifa del 2.5%
  @Column()
  value: string;
}
