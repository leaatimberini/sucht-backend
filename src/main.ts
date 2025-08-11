// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  process.env.TZ = 'America/Argentina/Buenos_Aires';
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });
  
  app.setGlobalPrefix('api');

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://sucht.com.ar',
      'http://sucht.com.ar',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // CORRECCIÓN: Se elimina 'forbidNonWhitelisted' para permitir peticiones GET sin DTO.
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Esta opción es segura y suficiente.
  }));

  const port = process.env.APP_PORT || 5000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();