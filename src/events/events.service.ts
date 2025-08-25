import { Injectable, NotFoundException, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository, LessThan } from 'typeorm';
import { Event } from './event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { NotificationsService } from 'src/notifications/notifications.service';
import { ConfigurationService } from 'src/configuration/configuration.service';
import { TZDate } from '@date-fns/tz';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Logger } from '@nestjs/common';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private readonly timeZone = 'America/Argentina/Buenos_Aires';

  constructor(
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigurationService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledEvents() {
    this.logger.log('Revisando eventos programados para publicar...');
    
    const now = new TZDate(new Date(), this.timeZone);

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

    const eventData: Partial<Event> = {
      ...restOfDto,
      flyerImageUrl: flyerImageUrl,
      startDate: new TZDate(startDate, this.timeZone),
      endDate: new TZDate(endDate, this.timeZone),
      publishAt: publishAt ? new TZDate(publishAt, this.timeZone) : new Date(),
      isPublished: !publishAt,
    };
    const event = this.eventsRepository.create(eventData);
    
    return this.eventsRepository.save(event);
  }

  async update(id: string, updateEventDto: UpdateEventDto, flyerImageUrl?: string): Promise<Event> {
    const event = await this.findOne(id);
    const { startDate, endDate, publishAt, ...restOfDto } = updateEventDto;
    
    const updatePayload: Partial<Event> = { ...restOfDto };

    if (startDate) updatePayload.startDate = new TZDate(startDate, this.timeZone);
    if (endDate) updatePayload.endDate = new TZDate(endDate, this.timeZone);
    if (publishAt) updatePayload.publishAt = new TZDate(publishAt, this.timeZone);
    
    if (flyerImageUrl !== undefined) {
      updatePayload.flyerImageUrl = flyerImageUrl;
    }
    
    this.eventsRepository.merge(event, updatePayload);
    return this.eventsRepository.save(event);
  }
  
  async findAll(): Promise<Event[]> {
    return this.eventsRepository.find({ 
        where: { isPublished: true },
        order: { startDate: 'DESC' } 
    });
  }

  async findAllForAdmin(): Promise<Event[]> {
    return this.eventsRepository.find({ order: { startDate: 'DESC' } });
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
    const now = new TZDate(new Date(), this.timeZone);

    return this.eventsRepository
      .createQueryBuilder('event')
      .where('event.endDate >= :now', { now }) // Comparamos contra la fecha de FIN
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