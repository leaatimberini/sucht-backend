import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { EventsService } from '../events/events.service';
import { TicketTiersService } from '../ticket-tiers/ticket-tiers.service';
import { TicketsService } from '../tickets/tickets.service';
import { RewardsService } from '../rewards/rewards.service';
import { ConfigurationService } from '../configuration/configuration.service';
import { User } from '../users/user.entity';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class BirthdayService {
  constructor(
    private readonly usersService: UsersService,
    private readonly eventsService: EventsService,
    private readonly ticketTiersService: TicketTiersService,
    private readonly ticketsService: TicketsService,
    private readonly rewardsService: RewardsService,
    private readonly configurationService: ConfigurationService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * Orquesta la creación del beneficio de cumpleaños "Clásico".
   * Genera un ticket grupal gratuito y asigna un premio de regalo.
   */
  async claimClassicBenefit(user: User, guestLimit: number) {
    const userProfile = await this.usersService.getProfile(user.id);
    if (!userProfile.isBirthdayWeek) {
      throw new BadRequestException('No estás en tu semana de cumpleaños.');
    }
    
    const upcomingEvent = await this.eventsService.findNextUpcomingEvent();
    if (!upcomingEvent) {
      throw new NotFoundException('No hay eventos próximos para asociar el beneficio.');
    }

    const birthdayTier = await this.ticketTiersService.findBirthdayTierForEvent(upcomingEvent.id);
    if (!birthdayTier) {
      throw new NotFoundException('No se ha configurado una entrada de cumpleaños para este evento.');
    }

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

    const birthdayRewardId = await this.configurationService.get('birthday_reward_id');
    if (!birthdayRewardId) {
      throw new NotFoundException('El premio de cumpleaños no ha sido configurado por el administrador.');
    }

    const birthdayReward = await this.rewardsService.assignFreeReward(
      user,
      birthdayRewardId,
      'BIRTHDAY', // Marcamos el origen del premio
    );

    return {
      message: 'Beneficio de cumpleaños reclamado con éxito.',
      ticket: birthdayTicket,
      reward: birthdayReward,
    };
  }

  /**
   * Orquesta la creación de una preferencia de pago para la oferta de Mesa VIP de cumpleaños.
   */
  async claimVipBenefit(user: User) {
    // 1. Validar que el usuario esté en su semana de cumpleaños
    const userProfile = await this.usersService.getProfile(user.id);
    if (!userProfile.isBirthdayWeek) {
      throw new BadRequestException('No estás en tu semana de cumpleaños.');
    }

    // 2. Encontrar el próximo evento
    const upcomingEvent = await this.eventsService.findNextUpcomingEvent();
    if (!upcomingEvent) {
      throw new NotFoundException('No hay eventos próximos para la oferta VIP.');
    }

    // 3. Encontrar el TicketTier de la oferta VIP para cumpleaños
    const vipOfferTier = await this.ticketTiersService.findBirthdayVipOfferForEvent(upcomingEvent.id);
    if (!vipOfferTier) {
      throw new NotFoundException('No se ha configurado una oferta VIP de cumpleaños para este evento.');
    }

    // 4. Verificar que haya stock disponible
    if (vipOfferTier.quantity < 1) {
      throw new BadRequestException('La oferta de Mesa VIP de cumpleaños está agotada para este evento.');
    }
    
    // 5. Verificar que la seña esté configurada
    if (!vipOfferTier.allowPartialPayment || !vipOfferTier.partialPaymentPrice) {
        throw new BadRequestException('La oferta VIP no está configurada para aceptar señas.');
    }

    // 6. Llamar al servicio de pagos para crear la preferencia de pago para la seña
    return this.paymentsService.createPreference(user, {
      eventId: upcomingEvent.id,
      ticketTierId: vipOfferTier.id,
      quantity: 1, // Es 1 mesa
      paymentType: 'partial', // Especificamos que es para pagar la seña
    });
  }
}