import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { ProductPurchase } from './product-purchase.entity';
import { StoreService } from './store.service';
import { StoreController } from './store.controller';
import { EventsModule } from 'src/events/events.module'; // Importamos EventsModule

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductPurchase]),
    EventsModule, // Lo añadimos para poder inyectar EventsService
  ],
  providers: [StoreService],
  controllers: [StoreController],
})
export class StoreModule {}