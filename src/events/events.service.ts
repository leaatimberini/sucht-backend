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
    const event = this.eventsRepository.create({
      ...createEventDto,
      flyerImageUrl: flyerImageUrl,
    });
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

  async update(id: string, updateEventDto: UpdateEventDto, flyerImageUrl?: string): Promise<Event> {
    const event = await this.findOne(id);

    this.eventsRepository.merge(event, updateEventDto);

    if (flyerImageUrl !== undefined) {
      event.flyerImageUrl = flyerImageUrl;
    }
    
    return this.eventsRepository.save(event);
  }

  async remove(id: string): Promise<void> {
    const result = await this.eventsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Event with ID "${id}" not found`);
    }
  }
}
