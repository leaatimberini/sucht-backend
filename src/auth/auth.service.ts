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

  async login(user: User) {
    /**
     * FUNCIÓN DEPURADA: Ahora que sabemos que TypeORM devuelve un array limpio,
     * la lógica es mucho más simple.
     */
    const cleanRoles = (roles: any): string[] => {
      // Los logs confirmaron que 'roles' ya es un array de strings correcto.
      if (Array.isArray(roles)) {
        return roles;
      }
      return []; // Fallback de seguridad
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