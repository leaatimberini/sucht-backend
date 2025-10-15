// src/store/store.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreService } from './store.service';
import { StoreController } from './store.controller';
import { Product } from './product.entity';
import { ProductPurchase } from './product-purchase.entity';
import { UsersModule } from 'src/users/users.module';
import { PointTransactionsModule } from 'src/point-transactions/point-transactions.module';
import { EventsModule } from 'src/events/events.module';
import { MercadoPagoModule } from 'src/payments/mercadopago.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductPurchase]),
    UsersModule,
    PointTransactionsModule,
    EventsModule,
    MercadoPagoModule,
  ],
  controllers: [StoreController],
  providers: [StoreService],
  exports: [StoreService],
})
export class StoreModule {}