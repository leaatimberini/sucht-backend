// backend/src/tickets/tickets.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './ticket.entity';
import { UsersModule } from 'src/users/users.module';
import { EventsModule } from 'src/events/events.module';
import { TicketTier } from 'src/ticket-tiers/ticket-tier.entity';
import { MailModule } from 'src/mail/mail.module';
import { PointTransactionsModule } from 'src/point-transactions/point-transactions.module';
import { ConfigurationModule } from 'src/configuration/configuration.module';
import { RewardsModule } from 'src/rewards/rewards.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Ticket, TicketTier]),
        forwardRef(() => UsersModule),
        EventsModule,
        MailModule,
        PointTransactionsModule,
        ConfigurationModule, // 2. Se añade a la lista de imports
        RewardsModule, // 3. Se añade RewardsModule
    ],
    controllers: [TicketsController],
    providers: [TicketsService],
    exports: [TicketsService],
})
export class TicketsModule { }