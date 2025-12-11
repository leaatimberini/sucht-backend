import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { RewardsModule } from 'src/rewards/rewards.module';

import { ConfigurationModule } from '../configuration/configuration.module';
import { ConfigurationService } from '../configuration/configuration.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => NotificationsModule),
    forwardRef(() => RewardsModule),
    ConfigurationModule, // Inyectamos ConfigurationModule
  ],
  providers: [UsersService],
  exports: [UsersService],
  controllers: [UsersController],
})
export class UsersModule { }