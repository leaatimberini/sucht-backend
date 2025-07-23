// LÍNEAS DE IMPORTACIÓN AÑADIDAS
import { UsersService } from './users/users.service';
import { Role } from './auth/enums/role.enum';
// FIN DE LÍNEAS AÑADIDAS

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors();
  app.setGlobalPrefix('api');
  // --- Script para crear el admin ---
  const usersService = app.get(UsersService);
  const adminEmail = 'leaa@sucht.com.ar'; // <-- CAMBIA ESTE EMAIL SI QUIERES
  
  const adminExists = await usersService.findOneByEmail(adminEmail);
  if (!adminExists) {
    console.log('Creando usuario administrador por defecto...');
    await usersService.create({
      name: 'Leandro',
      email: adminEmail,
      password: 'InocencioArias2998', // <-- CAMBIA ESTA CONTRASEÑA
      role: Role.Admin,
    });
    console.log('Usuario administrador creado con éxito.');
  }
  // --- Fin del script ---

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  const port = process.env.APP_PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();