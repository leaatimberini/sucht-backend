// backend/src/point-transactions/point-transactions.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointTransaction } from './point-transaction.entity';
import { PointTransactionsService } from './point-transactions.service';
import { PointTransactionsController } from './point-transactions.controller';
import { User } from 'src/users/user.entity';
import { ConfigurationModule } from 'src/configuration/configuration.module'; // Se importa
import { Event } from 'src/events/event.entity'; // Se importa

@Module({
  imports: [
    TypeOrmModule.forFeature([PointTransaction, User, Event]), // Se añaden entidades
    ConfigurationModule, // Se añade a los imports
  ],
  providers: [PointTransactionsService],
  controllers: [PointTransactionsController],
  exports: [PointTransactionsService],
})
export class PointTransactionsModule {}