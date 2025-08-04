// src/auth/guards/jwt-auth.guard.ts

import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  // Sobrescribimos el método canActivate para añadir la lógica del decorador @Public
  canActivate(context: ExecutionContext) {
    // Usamos Reflector para leer la metadata 'isPublic' que establece nuestro decorador
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si el endpoint está marcado como público, permitimos el acceso sin verificar el token
    if (isPublic) {
      return true;
    }

    // Si no es público, continuamos con la verificación normal del token JWT
    return super.canActivate(context);
  }
}