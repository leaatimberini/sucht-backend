// src/payments/payments.module.ts
import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { ConfigModule } from '@nestjs/config';
import { TicketsModule } from 'src/tickets/tickets.module';
import { UsersModule } from 'src/users/users.module';
import { TicketTiersModule } from 'src/ticket-tiers/ticket-tiers.module';
import { ConfigurationModule } from 'src/configuration/configuration.module'; // 1. IMPORTAR

@Module({
  imports: [
    ConfigModule,
    TicketsModule,
    UsersModule,
    TicketTiersModule,
    ConfigurationModule, // 2. AÑADIR A LOS IMPORTS
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
