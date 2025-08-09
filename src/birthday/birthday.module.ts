// backend/src/birthday/birthday.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BirthdayBenefit } from './birthday-benefit.entity';
import { BirthdayService } from './birthday.service';
import { BirthdayController } from './birthday.controller';
import { UsersModule } from '../users/users.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BirthdayBenefit]), // Registra nuestra entidad en la BBDD
    UsersModule, // Importamos UsersModule para poder acceder a UsersService
    EventsModule, // Importamos EventsModule para poder acceder a EventsService
  ],
  controllers: [BirthdayController], // El controlador que manejará las rutas HTTP
  providers: [BirthdayService], // El servicio que contendrá la lógica de negocio
})
export class BirthdayModule {}