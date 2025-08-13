import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RaffleWinner } from './raffle-winner.entity';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventsService } from '../events/events.service';
import { TicketsService } from '../tickets/tickets.service';
import { ConfigurationService } from '../configuration/configuration.service';
import { StoreService } from '../store/store.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { Ticket } from '../tickets/ticket.entity';
import { ProductType } from '../ticket-tiers/ticket-tier.entity';
import { endOfDay, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

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

  /**
   * TAREA AUTOMATIZADA (CRON JOB)
   * Se ejecuta todos los sábados a las 20:00:05, hora de Argentina.
   */
  @Cron('5 0 20 * * 6', {
    name: 'weeklyRaffle',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  async handleWeeklyRaffle() {
    this.logger.log('--- INICIANDO SORTEO SEMANAL ---');

    // Buscamos el evento que ocurra hoy
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

  /**
   * Realiza el sorteo para un evento específico.
   */
  async performDraw(eventId: string) {
    // 1. Obtener la lista ponderada de participantes
    const weightedEntries = await this.getEligibleEntries(eventId);
    if (weightedEntries.length === 0) {
      this.logger.log('No hay participantes elegibles para el sorteo.');
      return;
    }
    this.logger.log(`Total de chances en el sorteo: ${weightedEntries.length}`);

    // 2. Seleccionar un ganador al azar
    const winnerIndex = Math.floor(Math.random() * weightedEntries.length);
    const winnerId = weightedEntries[winnerIndex];
    const winner = await this.usersService.findOneById(winnerId);
    this.logger.log(`🎉 ¡El ganador es ${winner.email}!`);

    // 3. Obtener el premio configurado por el admin
    const prizeProductId = await this.configurationService.get('raffle_prize_product_id');
    if (!prizeProductId) {
      this.logger.error('ERROR: No hay un premio configurado para el sorteo. No se puede asignar.');
      return;
    }

    // 4. Asignar el premio al ganador (creando una "compra gratuita")
    const prizePurchase = await this.storeService.createFreePurchase(
      winner,
      prizeProductId,
      eventId,
      1, // El premio es siempre 1 unidad
      'RAFFLE_PRIZE'
    );
    this.logger.log(`Premio asignado. ID de la compra: ${prizePurchase.id}`);

    // 5. Guardar el registro del ganador en el historial
    const raffleWinner = this.raffleWinnerRepository.create({
      winner,
      winnerUserId: winner.id,
      event: { id: eventId } as any,
      eventId,
      prize: prizePurchase,
      prizePurchaseId: prizePurchase.id,
    });
    await this.raffleWinnerRepository.save(raffleWinner);
    this.logger.log(`Registro del ganador guardado en el historial. ID: ${raffleWinner.id}`);

    // 6. Notificar al ganador
    await this.notificationsService.sendNotificationToUser(winner, {
        title: '¡Felicitaciones, ganaste el sorteo! 🏆',
        body: `Ganaste: ${prizePurchase.product.name}. ¡Reclámalo en la barra con tu QR!`,
    });
    this.logger.log(`Notificación enviada al ganador.`);
    this.logger.log('--- SORTEO SEMANAL FINALIZADO ---');
  }

  /**
   * Obtiene una lista ponderada de IDs de usuario que participan en el sorteo.
   */
  private async getEligibleEntries(eventId: string): Promise<string[]> {
    const deadline = new Date();
    // La hora del sorteo es a las 20:00, así que esa es la fecha límite
    deadline.setHours(20, 0, 0, 0); 
    
    const tickets = await this.ticketsService.findTicketsForRaffle(eventId, deadline);
    
    const weightedEntries: string[] = [];
    for (const ticket of tickets) {
      let chances = 0;
      // Asignamos chances según las reglas
      if (ticket.tier.productType === ProductType.VIP_TABLE) {
        chances = 3; // Triple chance
      } else if (!ticket.tier.isFree) {
        chances = 2; // Doble chance
      } else {
        chances = 1; // Una chance
      }

      // Añadimos el ID del usuario a la lista tantas veces como chances tenga
      for (let i = 0; i < chances; i++) {
        weightedEntries.push(ticket.user.id);
      }
    }
    return weightedEntries;
  }

  /**
   * Obtiene el historial de ganadores para el panel de admin.
   */
  async getHistory() {
    return this.raffleWinnerRepository.find({
      order: { drawnAt: 'DESC' },
      // Las relaciones 'winner', 'event' y 'prize' ya se cargan con eager: true
    });
  }
}