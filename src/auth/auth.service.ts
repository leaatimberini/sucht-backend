import { Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/users/user.entity';
import { MailService } from 'src/mail/mail.service'; // 👈 Importación añadida

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService, // 👈 Inyección añadida
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);

    if (user && user.password && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: User) {
    // Lógica correcta: usa 'roles' (plural) en el payload
    const payload = { email: user.email, sub: user.id, roles: user.roles };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async sendWelcomeEmail(user: User) {
    if (!user.email) return;

    await this.mailService.sendMail(
      user.email,
      '🎉 ¡Bienvenido a SUCHT!',
      `
      <h1>Hola ${user.name || ''} 👋</h1>
      <p>Gracias por registrarte en <strong>SUCHT</strong>.</p>
      <p>Desde ahora vas a poder acceder a eventos, entradas, promociones y más 🎶🍸</p>
      `
    );
  }
}
