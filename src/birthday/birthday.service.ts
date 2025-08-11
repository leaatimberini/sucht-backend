import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { EventsService } from '../events/events.service';
import { TicketTiersService } from '../ticket-tiers/ticket-tiers.service';
import { TicketsService } from '../tickets/tickets.service';
import { RewardsService } from '../rewards/rewards.service';
import { ConfigurationService } from '../configuration/configuration.service';
import { User } from '../users/user.entity';

@Injectable()
export class BirthdayService {
  constructor(
    private readonly usersService: UsersService,
    private readonly eventsService: EventsService,
    private readonly ticketTiersService: TicketTiersService,
    private readonly ticketsService: TicketsService,
    private readonly rewardsService: RewardsService,
    private readonly configurationService: ConfigurationService,
  ) {}

  /**
   * Orquesta la creación del beneficio de cumpleaños "Clásico".
   * Genera un ticket grupal gratuito y asigna un premio de regalo.
   */
  async claimClassicBenefit(user: User, guestLimit: number) {
    // 1. Validar que el usuario esté en su semana de cumpleaños
    // Usamos el método que ya existe en UsersService para no duplicar lógica.
    const userProfile = await this.usersService.getProfile(user.id);
    if (!userProfile.isBirthdayWeek) {
      throw new BadRequestException('No estás en tu semana de cumpleaños.');
    }
    
    // 2. Encontrar el próximo evento
    const upcomingEvent = await this.eventsService.findNextUpcomingEvent();
    if (!upcomingEvent) {
      throw new NotFoundException('No hay eventos próximos para asociar el beneficio.');
    }

    // 3. Encontrar el Tipo de Entrada (TicketTier) gratuito para cumpleaños
    const birthdayTier = await this.ticketTiersService.findBirthdayTierForEvent(upcomingEvent.id);
    if (!birthdayTier) {
      throw new NotFoundException('No se ha configurado una entrada de cumpleaños para este evento.');
    }

    // 4. Crear el Ticket grupal y gratuito
    // La cantidad es el cumpleañero (1) + sus invitados
    const birthdayTicket = await this.ticketsService.createTicketAndSendEmail(
      user,
      {
        eventId: upcomingEvent.id,
        ticketTierId: birthdayTier.id,
        quantity: guestLimit + 1,
      },
      null, // Sin promotor
      0,    // amountPaid es 0
      null, // Sin paymentId
      'BIRTHDAY', // Marcamos el origen del ticket
    );

    // 5. Encontrar el ID del Premio de Cumpleaños desde la configuración general
    const birthdayRewardId = await this.configurationService.get('birthday_reward_id');
    if (!birthdayRewardId) {
      throw new NotFoundException('El premio de cumpleaños no ha sido configurado por el administrador.');
    }

    // 6. Asignar el Premio (regalo) al usuario
    const birthdayReward = await this.rewardsService.assignFreeReward(
      user,
      birthdayRewardId,
      'BIRTHDAY', // Marcamos el origen del premio
    );

    // 7. Devolver los objetos creados
    return {
      message: 'Beneficio de cumpleaños reclamado con éxito.',
      ticket: birthdayTicket,
      reward: birthdayReward,
    };
  }

  // Aquí añadiremos la lógica para la opción VIP más adelante
}