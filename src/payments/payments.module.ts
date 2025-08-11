// backend/src/payments/payments.module.ts
import { Module, forwardRef } from '@nestjs/common'; // 1. Importar forwardRef
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { ConfigModule } from '@nestjs/config';
import { TicketsModule } from 'src/tickets/tickets.module';
import { UsersModule } from 'src/users/users.module';
import { TicketTiersModule } from 'src/ticket-tiers/ticket-tiers.module';
import { ConfigurationModule } from 'src/configuration/configuration.module';

@Module({
  imports: [
    ConfigModule,
    // 2. Envolver los módulos en forwardRef
    forwardRef(() => TicketsModule),
    forwardRef(() => UsersModule),
    forwardRef(() => TicketTiersModule),
    forwardRef(() => ConfigurationModule),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}