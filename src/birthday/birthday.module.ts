import { Module } from '@nestjs/common';
import { BirthdayService } from './birthday.service';
import { BirthdayController } from './birthday.controller';
import { UsersModule } from '../users/users.module';
import { EventsModule } from '../events/events.module';
import { TicketTiersModule } from '../ticket-tiers/ticket-tiers.module';
import { TicketsModule } from '../tickets/tickets.module';
import { RewardsModule } from '../rewards/rewards.module';
import { ConfigurationModule } from '../configuration/configuration.module';
import { PaymentsModule } from '../payments/payments.module'; // <-- Importar

@Module({
  imports: [
    UsersModule,
    EventsModule,
    TicketTiersModule,
    TicketsModule,
    RewardsModule,
    ConfigurationModule,
    PaymentsModule, // <-- Añadir a los imports
  ],
  controllers: [BirthdayController],
  providers: [BirthdayService],
})
export class BirthdayModule {}