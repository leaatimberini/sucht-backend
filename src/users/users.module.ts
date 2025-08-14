import { Module, forwardRef } from '@nestjs/common'; // 1. Importar forwardRef
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { ConfigurationModule } from 'src/configuration/configuration.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    CloudinaryModule,
    ConfigurationModule,
    // 2. Envolvemos NotificationsModule en forwardRef para romper el ciclo
    forwardRef(() => NotificationsModule),
  ],
  providers: [UsersService],
  exports: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}