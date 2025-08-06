// backend/src/point-transactions/point-transactions.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointTransaction } from './point-transaction.entity';
import { PointTransactionsService } from './point-transactions.service';
import { PointTransactionsController } from './point-transactions.controller';
import { User } from 'src/users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PointTransaction, User]) // Importamos las entidades que usará el servicio
  ],
  providers: [PointTransactionsService],
  controllers: [PointTransactionsController],
  exports: [PointTransactionsService], // Exportamos el servicio para usarlo en otros módulos
})
export class PointTransactionsModule {}