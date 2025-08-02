// backend/src/configuration/configuration.entity.ts

import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('configurations')
export class Configuration {
  // La clave (key) será el identificador principal
  @PrimaryColumn()
  key: string; 

  // El valor se guardará como un string
  @Column()
  value: string;
}