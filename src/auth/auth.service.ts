import { Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from 'src/users/user.entity';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);

    if (!user || !user.password) {
      return null;
    }

    const isPasswordMatching = await bcrypt.compare(pass, user.password);

    if (isPasswordMatching) {
      const { password, ...result } = user;
      return result;
    }
    
    return null;
  }

  /**
   * CORRECCIÓN DEFINITIVA: Se ajusta la lógica de 'cleanRoles' para que sea más robusta.
   */
  async login(user: User) {
    const cleanRoles = (roles: any): string[] => {
      // Verifica si 'roles' es el string de array de PostgreSQL (ej: '{OWNER,ADMIN,CLIENT}')
      if (typeof roles === 'string' && roles.startsWith('{')) {
        return roles
          .slice(1, -1) // 1. Elimina las llaves '{' y '}' del principio y el final
          .split(',');  // 2. Divide el string en un array por las comas
      }
      // Si ya es un array normal, lo devuelve tal cual
      if (Array.isArray(roles)) {
        return roles;
      }
      return []; // Devuelve un array vacío como fallback seguro
    };

    const payload = { 
      email: user.email, 
      sub: user.id, 
      roles: cleanRoles(user.roles) 
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
  
  async sendWelcomeEmail(user: User) {
    if (!user.email) return;

    await this.mailService.sendMail(
      user.email,
      '🎉 ¡Bienvenido a SUCHT!',
      `<h1>Hola ${user.name || ''} 👋</h1><p>Gracias por registrarte en <strong>SUCHT</strong>.</p><p>Desde ahora vas a poder acceder a eventos, entradas, promociones y más 🎶🍸</p>`
    );
  }
}