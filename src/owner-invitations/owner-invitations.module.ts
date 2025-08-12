import { Module } from '@nestjs/common';
import { OwnerInvitationService } from './owner-invitations.service';
import { OwnerInvitationController } from './owner-invitations.controller';
import { UsersModule } from '../users/users.module';
import { EventsModule } from '../events/events.module';
import { TicketTiersModule } from '../ticket-tiers/ticket-tiers.module';
import { TicketsModule } from '../tickets/tickets.module';
import { MailModule } from '../mail/mail.module';
import { ConfigurationModule } from '../configuration/configuration.module';
import { StoreModule } from '../store/store.module'; // Se importa el módulo de la tienda

@Module({
  imports: [
    // Importamos todos los módulos cuyos servicios vamos a orquestar
    UsersModule,
    EventsModule,
    TicketTiersModule,
    TicketsModule,
    StoreModule, // Se añade StoreModule para poder usar StoreService
    MailModule,
    ConfigurationModule,
  ],
  controllers: [OwnerInvitationController],
  providers: [OwnerInvitationService],
})
export class OwnerInvitationModule {}