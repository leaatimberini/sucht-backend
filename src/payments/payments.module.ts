// src/payments/payments.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { UsersModule } from 'src/users/users.module';
import { TicketsModule } from 'src/tickets/tickets.module';
import { TicketTiersModule } from 'src/ticket-tiers/ticket-tiers.module';
import { ConfigurationModule } from 'src/configuration/configuration.module';
import { StoreModule } from 'src/store/store.module';
import { MercadoPagoModule } from './mercadopago.module';
import { MarketingModule } from '../marketing/marketing.module';

@Module({
  imports: [
    MercadoPagoModule,
    forwardRef(() => UsersModule),
    forwardRef(() => TicketsModule),
    forwardRef(() => TicketTiersModule),
    ConfigurationModule,
    forwardRef(() => StoreModule),
    MarketingModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule { }