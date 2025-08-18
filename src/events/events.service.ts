import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Event } from './event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { TZDate } from '@date-fns/tz'; // 1. Importar TZDate

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
  ) {}

  async create(createEventDto: CreateEventDto, flyerImageUrl?: string): Promise<Event> {
    const { startDate, endDate, ...restOfDto } = createEventDto;
    const timeZone = 'America/Argentina/Buenos_Aires';

    // 2. Usamos TZDate para asegurar que las fechas se interpreten en la zona horaria correcta
    const eventData: Partial<Event> = {
      ...restOfDto,
      flyerImageUrl: flyerImageUrl,
      startDate: new TZDate(startDate, timeZone),
      endDate: new TZDate(endDate, timeZone),
    };
    const event = this.eventsRepository.create(eventData);
    return this.eventsRepository.save(event);
  }

  async update(id: string, updateEventDto: UpdateEventDto, flyerImageUrl?: string): Promise<Event> {
    const event = await this.findOne(id);
    const { startDate, endDate, ...restOfDto } = updateEventDto;
    const timeZone = 'America/Argentina/Buenos_Aires';
    
    const updatePayload: Partial<Event> = { ...restOfDto };

    // 3. Aplicamos la misma lógica de TZDate para la actualización
    if (startDate) updatePayload.startDate = new TZDate(startDate, timeZone);
    if (endDate) updatePayload.endDate = new TZDate(endDate, timeZone);
    
    if (flyerImageUrl !== undefined) {
      updatePayload.flyerImageUrl = flyerImageUrl;
    }
    
    this.eventsRepository.merge(event, updatePayload);
    return this.eventsRepository.save(event);
  }
  
  async findAll(): Promise<Event[]> {
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
      select: ['id', 'title'],
      order: {
        startDate: 'DESC',
      },
    });
  }

  async findNextUpcomingEvent(): Promise<Event | null> {
    // 4. Usamos TZDate para que "ahora" sea la hora de Argentina
    const timeZone = 'America/Argentina/Buenos_Aires';
    const now = new TZDate(new Date(), timeZone);

    return this.eventsRepository
      .createQueryBuilder('event')
      .where('event.startDate >= :now', { now })
      .orderBy('event.startDate', 'ASC')
      .getOne();
  }

  async findEventBetweenDates(start: Date, end: Date): Promise<Event | null> {
    return this.eventsRepository.findOne({
        where: {
            startDate: Between(start, end)
        }
    });
  }
}