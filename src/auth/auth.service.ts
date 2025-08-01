import { Injectable, Logger } from '@nestjs/common'; // <-- Importar Logger
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from 'src/users/user.entity';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class AuthService {
  // Añadimos un logger para ver los mensajes en PM2
  private readonly logger = new Logger(AuthService.name);

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
    // --- INICIO DE LA PRUEBA DE FUEGO ---
    this.logger.log('--- INICIANDO PROCESO DE LOGIN PARA VERIFICAR ROLES ---');
    this.logger.log(`1. ROLES CRUDOS RECIBIDOS DEL OBJETO USER: ${JSON.stringify(user.roles)}`);
    // --- FIN DE LA PRUEBA ---

    const cleanRoles = (roles: any): string[] => {
      let rolesString: string;
      if (Array.isArray(roles) && roles.length > 0 && typeof roles[0] === 'string') {
        rolesString = roles[0];
      } else if (typeof roles === 'string') {
        rolesString = roles;
      } else if (Array.isArray(roles)) {
        return roles;
      } else {
        return [];
      }
      return rolesString.replace(/[{}"\s]/g, '').split(',').filter(role => role);
    };

    const finalRoles = cleanRoles(user.roles);

    // --- INICIO DE LA PRUEBA DE FUEGO ---
    this.logger.log(`2. ROLES LIMPIOS QUE SE INCLUIRÁN EN EL TOKEN: ${JSON.stringify(finalRoles)}`);
    this.logger.log('--- FIN DEL PROCESO DE LOGIN ---');
    // --- FIN DE LA PRUEBA ---

    const payload = { 
      email: user.email, 
      sub: user.id, 
      roles: finalRoles 
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