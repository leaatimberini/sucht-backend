import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './event.entity';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module'; // 1. IMPORTAR

@Module({
  imports: [
    TypeOrmModule.forFeature([Event]),
    CloudinaryModule, // 2. AÑADIR A LOS IMPORTS
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
