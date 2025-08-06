import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reward } from './reward.entity';
import { RewardsService } from './rewards.service';
import { RewardsController } from './rewards.controller';
import { UserReward } from './user-reward.entity'; // <-- 1. Importar nueva entidad
import { PointTransactionsModule } from 'src/point-transactions/point-transactions.module'; // <-- 2. Importar para usar su servicio

@Module({
  imports: [TypeOrmModule.forFeature([Reward, UserReward]),
PointTransactionsModule,
],
  providers: [RewardsService],
  controllers: [RewardsController],
  exports: [RewardsService],
})
export class RewardsModule {}