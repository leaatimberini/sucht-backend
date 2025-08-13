import { Module } from '@nestjs/common';
import { TicketTiersService } from './ticket-tiers.service';
// Se importa el nuevo controlador
import { TicketTiersController, RootTicketTiersController } from './ticket-tiers.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketTier } from './ticket-tier.entity';
import { EventsModule } from 'src/events/events.module';

@Module({
  imports: [TypeOrmModule.forFeature([TicketTier]), EventsModule],
  // Se añade el nuevo controlador a la lista
  controllers: [TicketTiersController, RootTicketTiersController],
  providers: [TicketTiersService],
  exports: [TicketTiersService],
})
export class TicketTiersModule {}