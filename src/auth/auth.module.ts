// src/auth/auth.module.ts

import { Module, forwardRef } from '@nestjs/common'; // <-- CAMBIO: Importar forwardRef
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    // FIX: Envolvemos los módulos que podrían causar la dependencia circular.
    // Esto difiere su carga hasta que todos los módulos estén disponibles.
    forwardRef(() => UsersModule),
    forwardRef(() => MailModule),

    // MANTENIDO: Tu configuración asíncrona de JWT es excelente, la conservamos.
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}