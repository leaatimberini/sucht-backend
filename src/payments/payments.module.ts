import { Module } from '@nestjs/common';
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
    TicketsModule,
    UsersModule,
    TicketTiersModule,
    ConfigurationModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  // --- LÍNEA AÑADIDA ---
  // Exportamos el servicio para que otros módulos puedan inyectarlo.
  exports: [PaymentsService],
})
export class PaymentsModule {}