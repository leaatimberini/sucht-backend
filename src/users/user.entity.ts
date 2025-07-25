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

export enum UserRole {
  ADMIN = 'admin',
  RRPP = 'rrpp',
  VERIFIER = 'verifier',
  CLIENT = 'client',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true }) // La contraseña ahora puede ser nula para usuarios invitados
  password?: string;

  @Column()
  name: string;
      
  @Column({ type: 'simple-array', default: [UserRole.CLIENT] }) // Cambiamos a un array para múltiples roles
  roles: UserRole[];

  // NUEVO CAMPO PARA INVITACIONES
  @Column({ nullable: true })
  invitationToken: string;
  
  @OneToMany(() => Ticket, (ticket) => ticket.user)
  tickets: Ticket[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @BeforeInsert()
  async hashPassword() {
    if (this.password) { // Solo hashea la contraseña si existe
      this.password = await bcrypt.hash(this.password, 10);
    }
  }
}