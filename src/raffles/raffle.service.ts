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
import { User } from '../users/user.entity';
import { MailService } from '../mail/mail.service';
import { ConfigurationService } from '../configuration/configuration.service';

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
    private readonly mailService: MailService,
    private readonly configurationService: ConfigurationService,
  ) {}

  async createOrUpdateRaffle(eventId: string, dto: ConfigureRaffleDto): Promise<Raffle> {
    const event = await this.eventsService.findOne(eventId);
    if (!event) throw new NotFoundException('Evento no encontrado.');

    let raffle = await this.raffleRepository.findOne({ where: { eventId }, relations: ['prizes'] });

    if (raffle) {
      // Si ya existe, actualizamos sus propiedades
      raffle.drawDate = new TZDate(dto.drawDate, 'America/Argentina/Buenos_Aires');
      raffle.numberOfWinners = dto.numberOfWinners;
      // Reemplazamos los premios antiguos por los nuevos
      raffle.prizes = dto.prizes.map(p => ({ ...p })) as any;
    } else {
      // Si no existe, creamos una nueva instancia
      raffle = this.raffleRepository.create({
        event,
        eventId,
        drawDate: new TZDate(dto.drawDate, 'America/Argentina/Buenos_Aires'),
        numberOfWinners: dto.numberOfWinners,
        prizes: dto.prizes as any,
      });
    }
    
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
      if (!prize || !prize.product) {
        this.logger.error(`No se encontró un premio o producto válido para el puesto ${i + 1}.`);
        continue;
      }

      const prizePurchase = await this.storeService.createFreePurchase(
        winnerUser, prize.productId, raffle.eventId, 1, 'RAFFLE_WINNER'
      );
      
      const winnerRecord = this.raffleWinnerRepository.create({
        raffle,
        user: winnerUser,
        prize,
        prizePurchaseId: prizePurchase.id,
      });
      await this.raffleWinnerRepository.save(winnerRecord);

      await this.notificationsService.sendNotificationToUser(winnerUser, {
        title: '¡Felicitaciones, ganaste el sorteo! 🏆',
        body: `Ganaste: ${prize.product.name}. ¡Reclámalo en la barra con tu QR!`,
      });
      await this.sendWinnerEmail(winnerUser, prize.product.name, prizePurchase.id, raffle.event.title);
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
  
  private async sendWinnerEmail(winner: User, prizeName: string, prizeQrId: string, eventName: string) {
    const frontendUrl = await this.configurationService.get('FRONTEND_URL') || 'https://sucht.com.ar';
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${prizeQrId}`;
    
    const emailHtml = `
      <div style="background-color: #121212; color: #ffffff; font-family: Arial, sans-serif; padding: 40px; text-align: center;">
        <div style="max-width: 600px; margin: auto; background-color: #1e1e1e; border-radius: 12px; overflow: hidden; border: 1px solid #333;">
          <div style="padding: 24px; background-color: #000000;">
            <h1 style="color: #ffffff; font-size: 28px; margin: 0;">SUCHT</h1>
          </div>
          <div style="padding: 30px;">
            <h2 style="color: #ffffff; font-size: 24px; margin-top: 0;">¡Felicitaciones, ${winner.name}!</h2>
            <p style="color: #bbbbbb; font-size: 16px;">Has ganado el sorteo del evento <strong>${eventName}</strong>.</p>
            
            <div style="margin: 30px 0; border: 2px solid #ffd700; border-radius: 12px; padding: 20px; background-color: #2a2a2a;">
              <h3 style="color: #ffffff; margin: 5px 0 15px 0; font-size: 22px;">Tu Premio: ${prizeName}</h3>
              <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 10px auto; max-width: 180px;"><img src="${qrApiUrl}" alt="QR del Premio" /></div>
              <p style="color: #bbbbbb; margin-top: 15px; font-size: 14px;">Presenta este QR en la barra para canjear tu premio.</p>
            </div>
            
            <a href="${frontendUrl}/mi-cuenta" target="_blank" style="display: inline-block; background-color: #D6006D; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">VER MIS PREMIOS</a>
          </div>
        </div>
      </div>
    `;
    
    await this.mailService.sendMail(
        winner.email,
        `🏆 ¡Ganaste el sorteo de SUCHT!`,
        emailHtml
    );
    this.logger.log(`Email de notificación del sorteo enviado a ${winner.email}`);
  }
}