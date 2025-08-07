// backend/src/store/store.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { ProductPurchase } from './product-purchase.entity';
import { StoreService } from './store.service';
import { StoreController } from './store.controller';
import { UsersModule } from 'src/users/users.module'; // 1. Se importa UsersModule
import { ConfigModule } from '@nestjs/config'; // 2. Se importa ConfigModule
import { PointTransactionsModule } from 'src/point-transactions/point-transactions.module'; // 3. Se importa PointTransactionsModule

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductPurchase]),
    UsersModule, // 4. Se añade a los imports
    ConfigModule, // 4. Se añade a los imports
    PointTransactionsModule, // 4. Se añade a los imports
  ],
  providers: [StoreService],
  controllers: [StoreController],
})
export class StoreModule {}