import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './event.entity';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module'; // 1. Importar
import { NotificationsModule } from 'src/notifications/notifications.module';
import { ConfigurationModule } from 'src/configuration/configuration.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event]),
    CloudinaryModule, // 2. Añadir a los imports
    forwardRef(() => NotificationsModule),
    ConfigurationModule,
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}