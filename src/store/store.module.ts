import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { ProductPurchase } from './product-purchase.entity';
import { StoreService } from './store.service';
import { StoreController } from './store.controller';
import { UsersModule } from 'src/users/users.module';
import { ConfigModule } from '@nestjs/config';
import { PointTransactionsModule } from 'src/point-transactions/point-transactions.module';
import { EventsModule } from 'src/events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductPurchase]),
    // Usamos forwardRef para evitar dependencias circulares con otros módulos
    forwardRef(() => UsersModule),
    forwardRef(() => EventsModule),
    ConfigModule,
    PointTransactionsModule,
  ],
  providers: [StoreService],
  controllers: [StoreController],
  // --- LÍNEA AÑADIDA ---
  // Exportamos el servicio para que otros módulos puedan inyectarlo y utilizarlo.
  exports: [StoreService],
})
export class StoreModule {}