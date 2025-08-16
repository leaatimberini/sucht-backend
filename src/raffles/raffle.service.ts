import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RaffleWinner } from './raffle-winner.entity';
import { Repository, In, Between } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { EventsService } from '../events/events.service';
import { TicketsService } from '../tickets/tickets.service';
import { ConfigurationService } from '../configuration/configuration.service';
import { StoreService } from '../store/store.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { Ticket } from '../tickets/ticket.entity';
import { ProductType } from '../ticket-tiers/ticket-tier.entity';
import { endOfDay, startOfDay } from 'date-fns';
import { toZonedTime, format } from 'date-fns-tz';

@Injectable()
export class RaffleService {
  private readonly logger = new Logger(RaffleService.name);

  constructor(
    @InjectRepository(RaffleWinner)
    private readonly raffleWinnerRepository: Repository<RaffleWinner>,
    private readonly eventsService: EventsService,
    private readonly ticketsService: TicketsService,
    private readonly configurationService: ConfigurationService,
    private readonly storeService: StoreService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('5 0 20 * * 6', {
    name: 'weeklyRaffle',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  async handleWeeklyRaffle() {
    this.logger.log('--- INICIANDO SORTEO SEMANAL ---');

    const timeZone = 'America/Argentina/Buenos_Aires';
    const now = toZonedTime(new Date(), timeZone);
    const startOfToday = startOfDay(now);
    const endOfToday = endOfDay(now);

    const eventToday = await this.eventsService.findEventBetweenDates(startOfToday, endOfToday);

    if (!eventToday) {
      this.logger.log('No hay evento programado para hoy. Sorteo omitido.');
      return;
    }

    this.logger.log(`Sorteo para el evento: ${eventToday.title}`);
    await this.performDraw(eventToday.id);
  }

  async performDraw(eventId: string) {
    this.logger.log(`[performDraw] Iniciando sorteo para el evento ID: ${eventId}`);
    const weightedEntries = await this.getEligibleEntries(eventId);
    if (weightedEntries.length === 0) {
      this.logger.log('[performDraw] No hay participantes elegibles para el sorteo.');
      return;
    }
    this.logger.log(`[performDraw] Total de chances en el sorteo: ${weightedEntries.length}`);

    const winnerIndex = Math.floor(Math.random() * weightedEntries.length);
    const winnerId = weightedEntries[winnerIndex];
    const winner = await this.usersService.findOneById(winnerId);
    this.logger.log(`[performDraw] 🎉 ¡El ganador es ${winner.email}!`);

    const prizeProductId = await this.configurationService.get('raffle_prize_product_id');
    if (!prizeProductId) {
      this.logger.error('[performDraw] ERROR: No hay un premio configurado para el sorteo. No se puede asignar.');
      return;
    }
    
    const prizeProduct = await this.storeService.findOneProduct(prizeProductId);

    const prizePurchase = await this.storeService.createFreePurchase(
      winner, prizeProductId, eventId, 1, 'RAFFLE_PRIZE'
    );
    this.logger.log(`[performDraw] Premio asignado. ID de la compra: ${prizePurchase.id}`);

    const event = await this.eventsService.findOne(eventId);
    const raffleWinner = this.raffleWinnerRepository.create({
      winner,
      winnerUserId: winner.id,
      event,
      eventId,
      prize: prizePurchase,
      prizePurchaseId: prizePurchase.id,
    });
    await this.raffleWinnerRepository.save(raffleWinner);
    this.logger.log(`[performDraw] Registro del ganador guardado en el historial. ID: ${raffleWinner.id}`);

    const isNotificationEnabled = await this.configurationService.get('notifications_raffle_enabled');
    if (isNotificationEnabled === 'true') {
        await this.notificationsService.sendNotificationToUser(winner, {
            title: '¡Felicitaciones, ganaste el sorteo! 🏆',
            body: `Ganaste: ${prizeProduct.name}. ¡Reclámalo en la barra con tu QR!`,
        });
        this.logger.log(`[performDraw] Notificación enviada al ganador.`);
    }
    
    this.logger.log('--- SORTEO SEMANAL FINALIZADO ---');
  }

  private async getEligibleEntries(eventId: string): Promise<string[]> {
    const event = await this.eventsService.findOne(eventId);
    if (!event) return [];

    const timeZone = 'America/Argentina/Buenos_Aires';
    const eventDateString = format(toZonedTime(event.startDate, timeZone), 'yyyy-MM-dd');
    const deadline = toZonedTime(`${eventDateString}T20:00:00`, timeZone);
    
    const tickets = await this.ticketsService.findTicketsForRaffle(eventId, deadline);
    
    const weightedEntries: string[] = [];
    for (const ticket of tickets) {
      let chances = 0;
      if (ticket.tier.productType === ProductType.VIP_TABLE) chances = 3;
      else if (!ticket.tier.isFree) chances = 2;
      else chances = 1;
      for (let i = 0; i < chances; i++) {
        weightedEntries.push(ticket.user.id);
      }
    }
    return weightedEntries;
  }

  async getHistory() {
    return this.raffleWinnerRepository.find({
      order: { drawnAt: 'DESC' },
    });
  }
  
  async getRaffleStatusForEvent(eventId: string) {
    const event = await this.eventsService.findOne(eventId);
    if (!event) {
      throw new NotFoundException('Evento no encontrado.');
    }

    const prizeProductId = await this.configurationService.get('raffle_prize_product_id');
    if (!prizeProductId) {
      return { prizeName: null, deadline: null };
    }

    const prizeProduct = await this.storeService.findOneProduct(prizeProductId);

    const timeZone = 'America/Argentina/Buenos_Aires';
    const eventDateString = format(toZonedTime(event.startDate, timeZone), 'yyyy-MM-dd');
    const deadline = toZonedTime(`${eventDateString}T20:00:00`, timeZone);
    
    this.logger.log(`[DEBUG] Deadline calculada para el sorteo: ${deadline.toISOString()}`);

    return {
      prizeName: prizeProduct.name,
      deadline: deadline.toISOString(),
    };
  }
}