import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { ConfigModule } from '@nestjs/config';
import { TicketsModule } from 'src/tickets/tickets.module';
import { UsersModule } from 'src/users/users.module';
import { TicketTiersModule } from 'src/ticket-tiers/ticket-tiers.module';

@Module({
  // Importamos todos los módulos que nuestro PaymentsService necesita
  imports: [
    ConfigModule,
    TicketsModule,
    UsersModule,
    TicketTiersModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
