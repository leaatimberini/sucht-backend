import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketTier } from './ticket-tier.entity';
import { EventsService } from 'src/events/events.service';
import { CreateTicketTierDto } from './dto/create-ticket-tier.dto';
import { UpdateTicketTierDto } from './dto/update-ticket-tier.dto';

@Injectable()
export class TicketTiersService {
  constructor(
    @InjectRepository(TicketTier)
    private ticketTiersRepository: Repository<TicketTier>,
    private eventsService: EventsService,
  ) {}

  async create(eventId: string, createTicketTierDto: CreateTicketTierDto): Promise<TicketTier> {
    const event = await this.eventsService.findOne(eventId);
    if (!event) {
      throw new NotFoundException(`Event with ID "${eventId}" not found`);
    }
    const ticketTier = this.ticketTiersRepository.create({
      ...createTicketTierDto,
      event: event,
    });
    return this.ticketTiersRepository.save(ticketTier);
  }

  async findByEvent(eventId: string): Promise<TicketTier[]> {
    return this.ticketTiersRepository.find({
      where: { event: { id: eventId } },
      order: { createdAt: 'ASC' },
    });
  }

  async update(tierId: string, updateTicketTierDto: UpdateTicketTierDto): Promise<TicketTier> {
    const tier = await this.ticketTiersRepository.preload({
      id: tierId,
      ...updateTicketTierDto,
    });
    if (!tier) {
      throw new NotFoundException(`Ticket Tier with ID "${tierId}" not found`);
    }
    return this.ticketTiersRepository.save(tier);
  }

  async remove(tierId: string): Promise<void> {
    const result = await this.ticketTiersRepository.delete(tierId);
    if (result.affected === 0) {
      throw new NotFoundException(`Ticket Tier with ID "${tierId}" not found`);
    }
  }
}
