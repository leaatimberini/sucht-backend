// backend/src/birthday/birthday.module.ts
import { Module, forwardRef } from '@nestjs/common'; // 1. Importar forwardRef
import { BirthdayService } from './birthday.service';
import { BirthdayController } from './birthday.controller';
import { UsersModule } from '../users/users.module';
import { EventsModule } from '../events/events.module';
import { TicketTiersModule } from '../ticket-tiers/ticket-tiers.module';
import { TicketsModule } from '../tickets/tickets.module';
import { RewardsModule } from '../rewards/rewards.module';
import { ConfigurationModule } from '../configuration/configuration.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    // 2. Envolver todos los módulos importados en forwardRef
    forwardRef(() => UsersModule),
    forwardRef(() => EventsModule),
    forwardRef(() => TicketTiersModule),
    forwardRef(() => TicketsModule),
    forwardRef(() => RewardsModule),
    forwardRef(() => ConfigurationModule),
    forwardRef(() => PaymentsModule),
  ],
  controllers: [BirthdayController],
  providers: [BirthdayService],
})
export class BirthdayModule {}