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

  // --- NUEVO CAMPO: USERNAME ---
  @Column({ unique: true, nullable: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password?: string;

  @Column()
  name: string;
      
  @Column({ 
    type: 'text',
    array: true,
    default: [UserRole.CLIENT] 
  })
  roles: UserRole[];

  @Column({ nullable: true })
  invitationToken: string;
  
  @Column({ nullable: true })
  profileImageUrl: string;

  @Column({ nullable: true })
  instagramHandle: string;

  @Column({ nullable: true })
  whatsappNumber: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date;

  @OneToMany(() => Ticket, (ticket) => ticket.user)
  tickets: Ticket[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @BeforeInsert()
  async hashPassword() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }
}