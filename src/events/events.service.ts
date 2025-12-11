import { Injectable, NotFoundException, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository, LessThan } from 'typeorm';
import { Event } from './event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { NotificationsService } from 'src/notifications/notifications.service';
import { ConfigurationService } from 'src/configuration/configuration.service';

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
  ) { }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleScheduledEvents() {
    this.logger.log('Revisando eventos programados para publicar...');

    const now = new Date();

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
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      publishAt: publishAt ? new Date(publishAt) : new Date(),
      isPublished: !publishAt,
    };
    const event = this.eventsRepository.create(eventData);

    const savedEvent = await this.eventsRepository.save(event);

    if (savedEvent.isPublished) {
      const isNewEventNotificationEnabled = await this.configService.get('notifications_newEvent_enabled');
      if (isNewEventNotificationEnabled === 'true') {
        this.notificationsService.sendNotificationToAll({
          title: '¡Nuevo Evento! 🎉',
          body: `¡Ya puedes conseguir tus entradas para ${savedEvent.title}!`,
        });
      }
    }

    return savedEvent;
  }

  async update(id: string, updateEventDto: UpdateEventDto, flyerImageUrl?: string): Promise<Event> {
    const event = await this.findOne(id);
    const { startDate, endDate, publishAt, ...restOfDto } = updateEventDto;

    const updatePayload: Partial<Event> = { ...restOfDto };

    if (startDate) updatePayload.startDate = new Date(startDate);
    if (endDate) updatePayload.endDate = new Date(endDate);
    if (publishAt) updatePayload.publishAt = new Date(publishAt);

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
    const now = new Date();

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

  async generateDescription(eventId: string, context?: string): Promise<{ description: string }> {
    const event = await this.findOne(eventId);

    // Format date for better context
    const formattedDate = new Date(event.startDate).toLocaleDateString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const prompt = `[INST] Eres un experto copywriter para eventos de vida nocturna y entretenimiento.

Genera una descripción atractiva y profesional para el siguiente evento:

Título: ${event.title}
Fecha: ${formattedDate}
Ubicación: ${event.location}
${context ? `Contexto adicional: ${context}` : ''}

La descripción debe:
- Ser emocionante y captar la atención del público joven (18-30 años)
- Incluir detalles relevantes del evento
- Tener entre 100-200 palabras
- Usar un tono juvenil, dinámico y entusiasta
- Incluir 2-3 emojis relevantes
- Estar en español argentino
- Motivar a comprar entradas

Genera SOLO la descripción, sin explicaciones adicionales. [/INST]`;

    try {
      // Use the existing AI service from marketing module
      // For now, return a placeholder that will be replaced when AI is properly integrated
      const description = `🎉 ¡Prepárate para vivir una noche inolvidable! ${event.title} llega el ${formattedDate} a ${event.location}.

Esta es tu oportunidad de disfrutar de la mejor música, ambiente increíble y una experiencia única que no te podés perder. 🔥

Reunite con tus amigos y viví la noche más épica del mes. Las entradas son limitadas, así que no esperes más para asegurar tu lugar en este evento imperdible. 💃🕺

¡Comprá tus entradas ahora y prepárate para una noche que vas a recordar siempre!`;

      return { description };
    } catch (error) {
      this.logger.error(`Failed to generate description for event ${eventId}:`, error);
      throw new Error('Failed to generate description');
    }
  }
}