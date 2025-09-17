// src/owner-invitations/owner-invitations.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { OwnerInvitationService } from './owner-invitations.service';
import { OwnerInvitationsController } from './owner-invitations.controller';
import { UsersModule } from '../users/users.module';
import { EventsModule } from '../events/events.module';
import { TicketTiersModule } from '../ticket-tiers/ticket-tiers.module';
import { TicketsModule } from '../tickets/tickets.module';
import { MailModule } from '../mail/mail.module';
import { ConfigurationModule } from '../configuration/configuration.module';
import { StoreModule } from '../store/store.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from '../tickets/ticket.entity';
import { ProductPurchase } from '../store/product-purchase.entity';
import { TicketTier } from 'src/ticket-tiers/ticket-tier.entity'; // 1. Importar TicketTier

@Module({
  imports: [
    // 2. Añadir TicketTier a la lista de entidades que este módulo puede manejar.
    TypeOrmModule.forFeature([Ticket, ProductPurchase, TicketTier]),

    forwardRef(() => UsersModule),
    forwardRef(() => TicketsModule),

    EventsModule,
    TicketTiersModule,
    StoreModule,
    MailModule,
    ConfigurationModule,
  ],
  controllers: [OwnerInvitationsController],
  providers: [OwnerInvitationService],
})
export class OwnerInvitationModule {}