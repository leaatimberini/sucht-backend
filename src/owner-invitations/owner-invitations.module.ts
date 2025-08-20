// owner-invitations.module.ts
import { Module } from '@nestjs/common';
import { OwnerInvitationService } from './owner-invitations.service';
import { OwnerInvitationController } from './owner-invitations.controller';
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
    // --- LÍNEA AÑADIDA ---
    // Registramos las entidades que el servicio necesita inyectar directamente.
    TypeOrmModule.forFeature([Ticket, ProductPurchase]),
    
    // Importamos todos los módulos cuyos servicios vamos a orquestar
    UsersModule,
    EventsModule,
    TicketTiersModule,
    TicketsModule,
    StoreModule,
    MailModule,
    ConfigurationModule,
  ],
  controllers: [OwnerInvitationController],
  providers: [OwnerInvitationService],
})
export class OwnerInvitationModule {}