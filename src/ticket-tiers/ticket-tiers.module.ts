// src/ticket-tiers/ticket-tiers.module.ts
import { Module } from '@nestjs/common';
import { TicketTiersService } from './ticket-tiers.service';
import { TicketTiersController } from './ticket-tiers.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketTier } from './ticket-tier.entity';
import { EventsModule } from 'src/events/events.module';

@Module({
  imports: [TypeOrmModule.forFeature([TicketTier]), EventsModule],
  controllers: [TicketTiersController],
  providers: [TicketTiersService],
  exports: [TicketTiersService], // <-- 👈 ¡ESTO FALTABA!
})
export class TicketTiersModule {}
