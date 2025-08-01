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
   * CORRECCIÓN: Se procesan los roles antes de crear el payload del JWT.
   */
  async login(user: User) {
    // La base de datos devuelve los roles como un string tipo '{OWNER,ADMIN,CLIENT}'
    // Esta función lo convierte en un array limpio: ['OWNER', 'ADMIN', 'CLIENT']
    const cleanRoles = (roles: any): string[] => {
      if (Array.isArray(roles) && typeof roles[0] === 'string' && roles[0].startsWith('{')) {
        return roles[0]
          .replace(/[{}"\s]/g, '') // Elimina llaves, comillas y espacios
          .split(','); // Divide por la coma
      }
      return roles; // Si ya es un array limpio, lo devuelve tal cual
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