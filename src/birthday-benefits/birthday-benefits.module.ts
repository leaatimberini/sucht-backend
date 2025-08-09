import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BirthdayBenefit } from './birthday-benefit.entity';
import { BirthdayBenefitsService } from './birthday-benefits.service';
import { BirthdayBenefitsController } from './birthday-benefits.controller';
import { TicketsModule } from 'src/tickets/tickets.module';
import { UsersModule } from 'src/users/users.module';
import { ConfigurationModule } from 'src/configuration/configuration.module';
import { TicketTier } from 'src/ticket-tiers/ticket-tier.entity';
import { Event } from 'src/events/event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BirthdayBenefit, TicketTier, Event]),
    TicketsModule,
    UsersModule,
    ConfigurationModule,
  ],
  providers: [BirthdayBenefitsService],
  controllers: [BirthdayBenefitsController],
  exports: [BirthdayBenefitsService],
})
export class BirthdayBenefitsModule {}