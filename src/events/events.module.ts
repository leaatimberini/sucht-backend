import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Event])],
  controllers: [EventsController],
  providers: [EventsService],
  // AÑADIMOS ESTA LÍNEA PARA HACER EL SERVICIO PÚBLICO
  exports: [EventsService],
})
export class EventsModule {}