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
     * FUNCIÓN DEFINITIVA Y ROBUSTA PARA LIMPIAR ROLES
     * Esta función maneja múltiples formatos para asegurar que siempre devuelva un array limpio.
     */
    const cleanRoles = (roles: any): string[] => {
      let rolesString: string;

      // Caso 1: El formato problemático ['{role1,role2}']
      if (Array.isArray(roles) && roles.length > 0 && typeof roles[0] === 'string') {
        rolesString = roles[0];
      } 
      // Caso 2: El formato ideal de 'simple-array' o el formato de array de PG "crudo"
      else if (typeof roles === 'string') {
        rolesString = roles;
      } 
      // Caso 3: Ya es un array limpio (poco probable pero seguro)
      else if (Array.isArray(roles)) {
        return roles;
      }
      // Si no es un formato reconocible, devuelve un array vacío
      else {
        return [];
      }

      // Limpia el string de cualquier caracter de array ('{}', '"') y lo convierte en un array
      return rolesString
        .replace(/[{}"\s]/g, '') // Elimina llaves, comillas y espacios
        .split(',')           // Divide por la coma
        .filter(role => role);  // Elimina elementos vacíos si los hubiera
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