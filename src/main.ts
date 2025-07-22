import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Activa la validación global
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Remueve los campos que no estén en el DTO
    forbidNonWhitelisted: true, // Lanza un error si se envían campos no permitidos
  }));

  const port = process.env.APP_PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();