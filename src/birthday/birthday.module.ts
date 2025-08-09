// backend/src/birthday/birthday.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BirthdayBenefit } from './birthday-benefit.entity';
import { BirthdayService } from './birthday.service';
import { BirthdayController } from './birthday.controller';
import { UsersModule } from '../users/users.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BirthdayBenefit]),
    // Usamos forwardRef aquí si BirthdayModule necesita servicios de UsersModule/EventsModule
    // y viceversa, para evitar dependencias circulares. Por ahora no es estrictamente necesario,
    // pero es una buena práctica si los módulos crecen.
    UsersModule, 
    EventsModule,
  ],
  controllers: [BirthdayController],
  providers: [BirthdayService],
  exports: [BirthdayService], // <-- AÑADE ESTA LÍNEA
})
export class BirthdayModule {}