// src/owner-invitations/owner-invitations.module.ts

import { Module, forwardRef } from '@nestjs/common'; // 1. Importar forwardRef
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

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, ProductPurchase]),

    // 2. Aplicamos forwardRef a los módulos que son parte del ciclo
    forwardRef(() => UsersModule),
    forwardRef(() => TicketsModule),

    // El resto de módulos no parecen ser parte del ciclo
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