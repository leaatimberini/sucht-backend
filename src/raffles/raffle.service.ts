import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RaffleWinner } from './raffle-winner.entity';
import { Repository, In, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventsService } from '../events/events.service';
import { TicketsService } from '../tickets/tickets.service';
import { ConfigurationService } from '../configuration/configuration.service';
import { StoreService } from '../store/store.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { Ticket } from '../tickets/ticket.entity';
import { ProductType } from '../ticket-tiers/ticket-tier.entity';
import { endOfDay, startOfDay, set } from 'date-fns';
import { toZonedTime } from 'date-fns-tz'; // Se utiliza para manejar zonas horarias

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
    // ... (lógica sin cambios)
  }

  private async getEligibleEntries(eventId: string): Promise<string[]> {
    const event = await this.eventsService.findOne(eventId);
    if (!event) return [];

    // --- CORRECCIÓN CLAVE DE ZONA HORARIA ---
    const timeZone = 'America/Argentina/Buenos_Aires';
    // 1. Tomamos la fecha de inicio del evento y la interpretamos en la zona horaria correcta.
    const eventDateInTz = toZonedTime(event.startDate, timeZone);
    // 2. Establecemos la hora límite a las 20:00 de ESE día, en ESA zona horaria.
    const deadline = set(eventDateInTz, { hours: 20, minutes: 0, seconds: 0, milliseconds: 0 });
    
    const tickets = await this.ticketsService.findTicketsForRaffle(eventId, deadline);
    
    const weightedEntries: string[] = [];
    for (const ticket of tickets) {
      let chances = 0;
      if (ticket.tier.productType === ProductType.VIP_TABLE) {
        chances = 3;
      } else if (!ticket.tier.isFree) {
        chances = 2;
      } else {
        chances = 1;
      }
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
      throw new NotFoundException('El premio para el sorteo no está configurado.');
    }

    const prizeProduct = await this.storeService.findOneProduct(prizeProductId);

    // --- CORRECCIÓN CLAVE DE ZONA HORARIA (idéntica a la anterior) ---
    const timeZone = 'America/Argentina/Buenos_Aires';
    const eventDateInTz = toZonedTime(event.startDate, timeZone);
    const deadline = set(eventDateInTz, { hours: 20, minutes: 0, seconds: 0, milliseconds: 0 });

    return {
      prizeName: prizeProduct.name,
      deadline: deadline.toISOString(), // Enviamos la fecha completa con la zona horaria correcta
    };
  }
}