import { Injectable, NotFoundException, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository, LessThan, Not } from 'typeorm';
import { Event } from './event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { NotificationsService } from 'src/notifications/notifications.service';
import { ConfigurationService } from 'src/configuration/configuration.service';
import { TZDate } from '@date-fns/tz';
import { Cron, CronExpression } from '@nestjs/schedule'; // 1. Importar Cron
import { Logger } from '@nestjs/common';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name); // Para logs

  constructor(
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigurationService,
  ) {}

  /**
   * TAREA AUTOMATIZADA: Revisa y publica eventos programados.
   * Se ejecuta cada minuto.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledEvents() {
    this.logger.log('Revisando eventos programados para publicar...');
    
    const now = new TZDate(new Date(), 'America/Argentina/Buenos_Aires');

    const eventsToPublish = await this.eventsRepository.find({
      where: {
        isPublished: false,
        publishAt: LessThan(now),
      },
    });

    if (eventsToPublish.length > 0) {
      this.logger.log(`Publicando ${eventsToPublish.length} evento(s) nuevo(s).`);
      
      for (const event of eventsToPublish) {
        event.isPublished = true;
        await this.eventsRepository.save(event);

        const isNewEventNotificationEnabled = await this.configService.get('notifications_newEvent_enabled');
        if (isNewEventNotificationEnabled === 'true') {
            this.notificationsService.sendNotificationToAll({
                title: '¡Nuevo Evento! 🎉',
                body: `¡Ya puedes conseguir tus entradas para ${event.title}!`,
            });
        }
      }
    }
  }

  async create(createEventDto: CreateEventDto, flyerImageUrl?: string): Promise<Event> {
    const { startDate, endDate, publishAt, ...restOfDto } = createEventDto;
    const timeZone = 'America/Argentina/Buenos_Aires';

    const eventData: Partial<Event> = {
      ...restOfDto,
      flyerImageUrl: flyerImageUrl,
      startDate: new TZDate(startDate, timeZone),
      endDate: new TZDate(endDate, timeZone),
      publishAt: publishAt ? new TZDate(publishAt, timeZone) : new Date(), // Si no hay fecha, se publica ya
      isPublished: !publishAt, // Si no hay fecha, se publica al instante
    };
    const event = this.eventsRepository.create(eventData);
    
    // La notificación se quita de aquí, ahora la maneja el Cron Job
    return this.eventsRepository.save(event);
  }

  async update(id: string, updateEventDto: UpdateEventDto, flyerImageUrl?: string): Promise<Event> {
    const event = await this.findOne(id);
    const { startDate, endDate, publishAt, ...restOfDto } = updateEventDto;
    const timeZone = 'America/Argentina/Buenos_Aires';
    
    const updatePayload: Partial<Event> = { ...restOfDto };

    if (startDate) updatePayload.startDate = new TZDate(startDate, timeZone);
    if (endDate) updatePayload.endDate = new TZDate(endDate, timeZone);
    if (publishAt) updatePayload.publishAt = new TZDate(publishAt, timeZone);
    
    if (flyerImageUrl !== undefined) {
      updatePayload.flyerImageUrl = flyerImageUrl;
    }
    
    this.eventsRepository.merge(event, updatePayload);
    return this.eventsRepository.save(event);
  }
  
  async findAll(onlyPublished: boolean = true): Promise<Event[]> {
    const whereClause: any = { order: { startDate: 'DESC' } };
    if(onlyPublished) {
        whereClause.where = { isPublished: true };
    }
    return this.eventsRepository.find(whereClause);
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.eventsRepository.findOne({ where: { id }, relations: ['ticketTiers'] });
    if (!event) {
      throw new NotFoundException(`Event with ID "${id}" not found`);
    }
    return event;
  }

  async remove(id: string): Promise<void> {
    const result = await this.eventsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Event with ID "${id}" not found`);
    }
  }

  async requestConfirmation(eventId: string): Promise<Event> {
    const event = await this.findOne(eventId);
    event.confirmationSentAt = new Date();
    return this.eventsRepository.save(event);
  }

  async findAllForSelect(): Promise<{ id: string; title: string }[]> {
    return this.eventsRepository.find({
      where: { isPublished: true },
      select: ['id', 'title'],
      order: {
        startDate: 'DESC',
      },
    });
  }

  async findNextUpcomingEvent(): Promise<Event | null> {
    const timeZone = 'America/Argentina/Buenos_Aires';
    const now = new TZDate(new Date(), timeZone);

    return this.eventsRepository
      .createQueryBuilder('event')
      .where('event.startDate >= :now', { now })
      .andWhere('event.isPublished = true')
      .orderBy('event.startDate', 'ASC')
      .getOne();
  }

  async findEventBetweenDates(start: Date, end: Date): Promise<Event | null> {
    return this.eventsRepository.findOne({
        where: {
            startDate: Between(start, end),
            isPublished: true
        }
    });
  }
}