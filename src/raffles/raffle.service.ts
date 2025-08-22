import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventsService } from '../events/events.service';
import { TicketsService } from '../tickets/tickets.service';
import { StoreService } from '../store/store.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { Raffle, RaffleStatus } from './raffle.entity';
import { RaffleWinner } from './raffle-winner.entity';
import { ConfigureRaffleDto } from './dto/configure-raffle.dto';
import { TZDate } from '@date-fns/tz';
import { User } from '../users/user.entity'; // 1. Importar la entidad User

@Injectable()
export class RaffleService {
  private readonly logger = new Logger(RaffleService.name);

  constructor(
    @InjectRepository(Raffle)
    private readonly raffleRepository: Repository<Raffle>,
    @InjectRepository(RaffleWinner)
    private readonly raffleWinnerRepository: Repository<RaffleWinner>,
    private readonly eventsService: EventsService,
    private readonly ticketsService: TicketsService,
    private readonly storeService: StoreService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createOrUpdateRaffle(eventId: string, dto: ConfigureRaffleDto): Promise<Raffle> {
    const event = await this.eventsService.findOne(eventId);
    if (!event) throw new NotFoundException('Evento no encontrado.');

    let raffle = await this.raffleRepository.findOne({ where: { eventId } });

    // 2. Lógica corregida para manejar la creación y actualización
    if (raffle) {
      // Si ya existe, actualizamos sus propiedades
      raffle.drawDate = new TZDate(dto.drawDate, 'America/Argentina/Buenos_Aires');
      raffle.numberOfWinners = dto.numberOfWinners;
      // Eliminamos los premios antiguos para reemplazarlos por los nuevos
      raffle.prizes = []; 
    } else {
      // Si no existe, creamos una nueva instancia
      raffle = this.raffleRepository.create({
        event,
        eventId,
        drawDate: new TZDate(dto.drawDate, 'America/Argentina/Buenos_Aires'),
        numberOfWinners: dto.numberOfWinners,
      });
    }
    
    // Asignamos los nuevos premios
    raffle.prizes = dto.prizes.map(p => ({ ...p })) as any;

    return this.raffleRepository.save(raffle);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledDraws() {
    this.logger.log('Revisando sorteos programados...');
    const now = new TZDate(new Date(), 'America/Argentina/Buenos_Aires');
    
    const rafflesToRun = await this.raffleRepository
      .createQueryBuilder('raffle')
      .leftJoinAndSelect('raffle.event', 'event')
      .leftJoinAndSelect('raffle.prizes', 'prizes')
      .leftJoinAndSelect('prizes.product', 'product')
      .where('raffle.status = :status', { status: RaffleStatus.PENDING })
      .andWhere('raffle.drawDate <= :now', { now })
      .getMany();

    if (rafflesToRun.length > 0) {
      this.logger.log(`Ejecutando ${rafflesToRun.length} sorteo(s).`);
      for (const raffle of rafflesToRun) {
        await this.performDraw(raffle);
      }
    }
  }

  private async performDraw(raffle: Raffle) {
    this.logger.log(`Iniciando sorteo para el evento: ${raffle.event.title}`);
    const eligibleEntries = await this.ticketsService.findTicketsForRaffle(raffle.eventId, raffle.drawDate);
    if (eligibleEntries.length === 0) {
      this.logger.warn('No hay participantes. El sorteo se completará sin ganadores.');
      raffle.status = RaffleStatus.COMPLETED;
      await this.raffleRepository.save(raffle);
      return;
    }

    const uniqueParticipants = [...new Set(eligibleEntries.map(ticket => ticket.user))];
    const winners = this.selectWinners(uniqueParticipants, raffle.numberOfWinners);

    for (let i = 0; i < winners.length; i++) {
      const winnerUser = winners[i];
      const prize = raffle.prizes.find(p => p.prizeRank === i + 1);
      if (!prize) {
        this.logger.error(`No se encontró un premio para el puesto ${i + 1}.`);
        continue;
      }

      const winnerRecord = this.raffleWinnerRepository.create({
        raffle,
        user: winnerUser,
        prize,
      });
      await this.raffleWinnerRepository.save(winnerRecord);

      await this.notificationsService.sendNotificationToUser(winnerUser, {
        title: '¡Felicitaciones, ganaste el sorteo! 🏆',
        body: `Ganaste: ${prize.product.name}. ¡Reclámalo en la barra con tu QR!`,
      });
    }

    raffle.status = RaffleStatus.COMPLETED;
    await this.raffleRepository.save(raffle);
    this.logger.log(`Sorteo para ${raffle.event.title} finalizado.`);
  }
  
  private selectWinners(participants: User[], count: number): User[] {
    const shuffled = [...participants].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  async getRaffleForEvent(eventId: string): Promise<Raffle | null> {
    return this.raffleRepository.findOne({ 
      where: { eventId }, 
      relations: ['prizes', 'prizes.product', 'winners', 'winners.user', 'winners.prize', 'winners.prize.product'] 
    });
  }
}