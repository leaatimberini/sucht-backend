import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
  ) {}

  async create(createEventDto: CreateEventDto, flyerImageUrl?: string): Promise<Event> {
    const { startDate, endDate, ...restOfDto } = createEventDto;

    const eventData: Partial<Event> = {
      ...restOfDto,
      flyerImageUrl: flyerImageUrl,
      // Convertimos las fechas de string a Date
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    };

    const event = this.eventsRepository.create(eventData);
    return this.eventsRepository.save(event);
  }

  async update(id: string, updateEventDto: UpdateEventDto, flyerImageUrl?: string): Promise<Event> {
    const event = await this.findOne(id);
    
    // Desestructuramos para manejar las fechas por separado
    const { startDate, endDate, ...restOfDto } = updateEventDto;
    
    const updatePayload: Partial<Event> = { ...restOfDto };

    // Convertimos las fechas si están presentes en el DTO
    if (startDate) updatePayload.startDate = new Date(startDate);
    if (endDate) updatePayload.endDate = new Date(endDate);

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
    const event = await this.eventsRepository.findOneBy({ id });
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
}
