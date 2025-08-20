// src/ticket-tiers/ticket-tiers.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not } from 'typeorm';
import { TicketTier, ProductType } from './ticket-tier.entity';
import { EventsService } from 'src/events/events.service';
import { CreateTicketTierDto } from './dto/create-ticket-tier.dto';
import { UpdateTicketTierDto } from './dto/update-ticket-tier.dto';

@Injectable()
export class TicketTiersService {
  constructor(
    @InjectRepository(TicketTier)
    private ticketTiersRepository: Repository<TicketTier>,
    private eventsService: EventsService,
    private dataSource: DataSource,
  ) {}

  async create(eventId: string, createTicketTierDto: CreateTicketTierDto): Promise<TicketTier> {
    const event = await this.eventsService.findOne(eventId);
    if (!event) {
      throw new NotFoundException(`Event with ID "${eventId}" not found`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (createTicketTierDto.isBirthdayDefault) {
        await queryRunner.manager.update(
          TicketTier,
          { event: { id: eventId } },
          { isBirthdayDefault: false },
        );
      }
      if (createTicketTierDto.isBirthdayVipOffer) {
        await queryRunner.manager.update(
          TicketTier,
          { event: { id: eventId } },
          { isBirthdayVipOffer: false },
        );
      }

      const ticketTier = queryRunner.manager.create(TicketTier, {
        ...createTicketTierDto,
        event: event,
      });

      const savedTier = await queryRunner.manager.save(ticketTier);
      await queryRunner.commitTransaction();
      return savedTier;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findByEvent(eventId: string): Promise<TicketTier[]> {
    return this.ticketTiersRepository.find({
      where: { event: { id: eventId } },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(tierId: string): Promise<TicketTier> {
    const tier = await this.ticketTiersRepository.findOne({ where: { id: tierId }, relations: ['event'] });
    if (!tier) {
      throw new NotFoundException(`Ticket Tier with ID "${tierId}" not found`);
    }
    return tier;
  }

  async update(tierId: string, updateTicketTierDto: UpdateTicketTierDto): Promise<TicketTier> {
    const tierToUpdate = await this.findOne(tierId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const eventId = tierToUpdate.event.id;

      if (updateTicketTierDto.isBirthdayDefault) {
        await queryRunner.manager.update(
            TicketTier,
            { event: { id: eventId }, id: Not(tierId) },
            { isBirthdayDefault: false }
        );
      }

      if (updateTicketTierDto.isBirthdayVipOffer) {
        await queryRunner.manager.update(
            TicketTier,
            { event: { id: eventId }, id: Not(tierId) },
            { isBirthdayVipOffer: false }
        );
      }

      const updatedTier = await queryRunner.manager.preload(TicketTier, {
        id: tierId,
        ...updateTicketTierDto,
      });

      if (!updatedTier) {
        throw new NotFoundException(`Ticket Tier with ID "${tierId}" not found during preload`);
      }

      const savedTier = await queryRunner.manager.save(updatedTier);
      await queryRunner.commitTransaction();
      return savedTier;

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(tierId: string): Promise<void> {
    const result = await this.ticketTiersRepository.delete(tierId);
    if (result.affected === 0) {
      throw new NotFoundException(`Ticket Tier with ID "${tierId}" not found`);
    }
  }

  async findBirthdayTierForEvent(eventId: string): Promise<TicketTier | null> {
    return this.ticketTiersRepository.findOne({
      where: {
        event: { id: eventId },
        isBirthdayDefault: true,
        isFree: true,
      },
    });
  }

  async findBirthdayVipOfferForEvent(eventId: string): Promise<TicketTier | null> {
    return this.ticketTiersRepository.findOne({
      where: {
        event: { id: eventId },
        isBirthdayVipOffer: true,
      },
    });
  }

  // **NUEVO MÉTODO:** Encuentra un ticket tier de tipo MESA VIP para un evento.
  async findVipTierForEvent(eventId: string): Promise<TicketTier | null> {
      return this.ticketTiersRepository.findOne({
          where: {
              event: { id: eventId },
              productType: ProductType.VIP_TABLE,
          },
      });
  }

  async findGiftableProducts(): Promise<TicketTier[]> {
    const upcomingEvent = await this.eventsService.findNextUpcomingEvent();
    if (!upcomingEvent) {
      return [];
    }

    return this.ticketTiersRepository.find({
      where: {
        event: { id: upcomingEvent.id },
        productType: ProductType.VOUCHER,
        quantity: Not(0),
      },
      order: {
        price: 'ASC',
      },
    });
  }

  /**
   * NUEVO MÉTODO DE APOYO: Busca un tier gratuito genérico para un evento.
   * Usado por el OwnerInvitationService para encontrar una entrada base para las invitaciones.
   */
  async findDefaultFreeTierForEvent(eventId: string): Promise<TicketTier | null> {
    return this.ticketTiersRepository.findOne({
      where: {
        event: { id: eventId },
        isFree: true,
        productType: ProductType.TICKET, // Nos aseguramos de que sea una entrada, no un voucher
      },
      order: {
        createdAt: 'ASC', // Tomamos el primero que se haya creado
      }
    });
  }
}