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

  // LÓGICA DE ACTUALIZACIÓN CORREGIDA
  async update(id: string, updateEventDto: UpdateEventDto, flyerImageUrl?: string): Promise<Event> {
    // 1. Buscamos el evento existente
    const event = await this.findOne(id);

    // 2. Usamos 'merge' para aplicar los cambios del DTO (title, location, etc.)
    //    'merge' ignora de forma segura cualquier campo extra como 'flyerImage' del DTO.
    this.eventsRepository.merge(event, updateEventDto);

    // 3. Manejamos la actualización de la imagen explícitamente
    if (flyerImageUrl !== undefined) {
      event.flyerImageUrl = flyerImageUrl;
    }
    
    // 4. Guardamos la entidad 'event' ya actualizada
    return this.eventsRepository.save(event);
  }

  async remove(id: string): Promise<void> {
    const result = await this.eventsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Event with ID "${id}" not found`);
    }
  }
}