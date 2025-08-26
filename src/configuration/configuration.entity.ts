import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('configurations')
export class Configuration {
  @PrimaryColumn({ type: 'varchar' })
  key: string;

  @Column({ type: 'text' })
  value: string;
}