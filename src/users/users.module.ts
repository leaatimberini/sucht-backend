import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { ConfigurationModule } from 'src/configuration/configuration.module';
import { NotificationsModule } from 'src/notifications/notifications.module'; // 1. IMPORTAR

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    CloudinaryModule,
    ConfigurationModule,
    NotificationsModule, // 2. AÑADIR A LOS IMPORTS
  ],
  providers: [UsersService],
  exports: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}