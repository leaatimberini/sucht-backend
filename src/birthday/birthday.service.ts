import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { EventsService } from '../events/events.service';
import { TicketTiersService } from '../ticket-tiers/ticket-tiers.service';
import { TicketsService } from '../tickets/tickets.service';
import { RewardsService } from '../rewards/rewards.service';
import { ConfigurationService } from '../configuration/configuration.service';
import { User } from '../users/user.entity';
import { PaymentsService } from '../payments/payments.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BirthdayService {
  private readonly logger = new Logger(BirthdayService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly eventsService: EventsService,
    private readonly ticketTiersService: TicketTiersService,
    private readonly ticketsService: TicketsService,
    private readonly rewardsService: RewardsService,
    private readonly configurationService: ConfigurationService,
    private readonly paymentsService: PaymentsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * TAREA AUTOMATIZADA: Se ejecuta todos los días a las 10 AM (hora Argentina).
   * Busca a los usuarios que inician su semana de cumpleaños y les envía una notificación.
   */
  @Cron(CronExpression.EVERY_DAY_AT_10AM, {
    name: 'birthdayNotifications',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  async handleBirthdayNotifications() {
    this.logger.log('Ejecutando tarea de notificación de cumpleaños...');
    
    const isEnabled = await this.configurationService.get('notifications_birthday_enabled');
    if (isEnabled !== 'true') {
      this.logger.log('Las notificaciones de cumpleaños están desactivadas. Omitiendo.');
      return;
    }

    const allUsers = await this.usersService.findAll();
    const usersInBirthdayWeek = allUsers.filter(user => 
        this.usersService.isBirthdayWeek(user.dateOfBirth)
    );

    this.logger.log(`Se encontraron ${usersInBirthdayWeek.length} usuarios en su semana de cumpleaños.`);

    for (const user of usersInBirthdayWeek) {
        // Aquí se podría añadir una lógica para evitar notificar al mismo usuario varias veces en la misma semana.
        // Por ahora, se enviará una notificación cada día que esté dentro de su semana.
        await this.notificationsService.sendNotificationToUser(user, {
            title: '¡Feliz Semana de Cumpleaños! 🎂',
            body: 'No te olvides de reclamar tu beneficio especial en tu cuenta de SUCHT.',
        });
    }
    this.logger.log('Notificaciones de cumpleaños enviadas.');
  }

  /**
   * Orquesta la creación del beneficio de cumpleaños "Clásico".
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
      null, 0, null, 'BIRTHDAY'
    );

    const birthdayRewardId = await this.configurationService.get('birthday_reward_id');
    if (!birthdayRewardId) {
      throw new NotFoundException('El premio de cumpleaños no ha sido configurado por el administrador.');
    }

    const birthdayReward = await this.rewardsService.assignFreeReward(
      user,
      birthdayRewardId,
      'BIRTHDAY'
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
    const userProfile = await this.usersService.getProfile(user.id);
    if (!userProfile.isBirthdayWeek) {
      throw new BadRequestException('No estás en tu semana de cumpleaños.');
    }

    const upcomingEvent = await this.eventsService.findNextUpcomingEvent();
    if (!upcomingEvent) {
      throw new NotFoundException('No hay eventos próximos para la oferta VIP.');
    }

    const vipOfferTier = await this.ticketTiersService.findBirthdayVipOfferForEvent(upcomingEvent.id);
    if (!vipOfferTier) {
      throw new NotFoundException('No se ha configurado una oferta VIP de cumpleaños para este evento.');
    }

    if (vipOfferTier.quantity < 1) {
      throw new BadRequestException('La oferta de Mesa VIP de cumpleaños está agotada para este evento.');
    }
    
    if (!vipOfferTier.allowPartialPayment || !vipOfferTier.partialPaymentPrice) {
        throw new BadRequestException('La oferta VIP no está configurada para aceptar señas.');
    }

    return this.paymentsService.createPreference(user, {
      eventId: upcomingEvent.id,
      ticketTierId: vipOfferTier.id,
      quantity: 1,
      paymentType: 'partial',
    });
  }
    
  /**
   * Verifica qué ofertas de cumpleaños están disponibles para el usuario.
   */
  async checkAvailableOffers(user: User) {
    const response = {
      isBirthdayWeek: false,
      isClassicOfferAvailable: false,
      isVipOfferAvailable: false,
      claimedBenefit: null as any,
    };

    const userProfile = await this.usersService.getProfile(user.id);
    response.isBirthdayWeek = userProfile.isBirthdayWeek;
    if (!response.isBirthdayWeek) return response;

    const upcomingEvent = await this.eventsService.findNextUpcomingEvent();
    if (!upcomingEvent) return response;
    
    const existingTicket = await this.ticketsService.findBirthdayTicketForUser(user.id, upcomingEvent.id);
    if (existingTicket) {
      const existingReward = await this.rewardsService.findBirthdayRewardForUser(user.id, upcomingEvent.id);
      response.claimedBenefit = { ticket: existingTicket, reward: existingReward };
      return response;
    }

    const classicTier = await this.ticketTiersService.findBirthdayTierForEvent(upcomingEvent.id);
    const vipTier = await this.ticketTiersService.findBirthdayVipOfferForEvent(upcomingEvent.id);

    if (classicTier) response.isClassicOfferAvailable = true;
    if (vipTier && vipTier.quantity > 0) response.isVipOfferAvailable = true;

    return response;
  }
}