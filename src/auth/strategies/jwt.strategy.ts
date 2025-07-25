import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private usersService: UsersService,
    private configService: ConfigService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    
    if (!secret) {
      throw new Error('JWT_SECRET no se encontró en las variables de entorno');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: { sub: string; email: string, roles: string[] }) {
    const user = await this.usersService.findOneByEmail(payload.email);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    // CORRECCIÓN: Devolvemos 'roles' (plural)
    return { id: payload.sub, email: payload.email, roles: user.roles };
  }
}