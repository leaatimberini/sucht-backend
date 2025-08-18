import { Module, forwardRef } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { ConfigModule } from '@nestjs/config';
import { TicketsModule } from 'src/tickets/tickets.module';
import { UsersModule } from 'src/users/users.module';
import { TicketTiersModule } from 'src/ticket-tiers/ticket-tiers.module';
import { ConfigurationModule } from 'src/configuration/configuration.module';
import { StoreModule } from 'src/store/store.module'; // 1. Importar StoreModule

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => TicketsModule),
    forwardRef(() => UsersModule),
    forwardRef(() => TicketTiersModule),
    forwardRef(() => ConfigurationModule),
    forwardRef(() => StoreModule), // 2. Añadir StoreModule a los imports
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}