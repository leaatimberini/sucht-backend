// src/ticket-tiers/ticket-tiers.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not, QueryRunner } from 'typeorm';
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

  // REFACTOR: La firma del método ahora solo acepta el DTO.
  async create(createTicketTierDto: CreateTicketTierDto): Promise<TicketTier> {
    const { eventId } = createTicketTierDto;
    const event = await this.eventsService.findOne(eventId);
    // La validación de Not Found ya la hace el eventsService, así que no es necesario duplicarla.

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (createTicketTierDto.isBirthdayDefault) {
        await this._ensureUniqueFlag(queryRunner, eventId, 'isBirthdayDefault');
      }
      if (createTicketTierDto.isBirthdayVipOffer) {
        await this._ensureUniqueFlag(queryRunner, eventId, 'isBirthdayVipOffer');
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
      order: { price: 'ASC', createdAt: 'ASC' },
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
        await this._ensureUniqueFlag(queryRunner, eventId, 'isBirthdayDefault', tierId);
      }
      if (updateTicketTierDto.isBirthdayVipOffer) {
        await this._ensureUniqueFlag(queryRunner, eventId, 'isBirthdayVipOffer', tierId);
      }

      // Usamos preload para cargar la entidad y aplicar los cambios del DTO
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

  // FIX: El método ahora devuelve un array de mesas y tiene un nombre en plural.
  async findVipTiersForEvent(eventId: string): Promise<TicketTier[]> {
    return this.ticketTiersRepository.find({
      where: {
        event: { id: eventId },
        productType: ProductType.VIP_TABLE,
      },
      order: {
        tableNumber: 'ASC', // Ordenamos por número de mesa
      }
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

  async findDefaultFreeTierForEvent(eventId: string): Promise<TicketTier | null> {
    return this.ticketTiersRepository.findOne({
      where: {
        event: { id: eventId },
        isFree: true,
        productType: ProductType.TICKET,
      },
      order: {
        createdAt: 'ASC',
      }
    });
  }
  
  // REFACTOR: Nuevo método privado para no repetir la lógica de los flags de cumpleaños.
  private async _ensureUniqueFlag(queryRunner: QueryRunner, eventId: string, flag: 'isBirthdayDefault' | 'isBirthdayVipOffer', excludeTierId?: string): Promise<void> {
    const conditions: any = { event: { id: eventId } };
    if (excludeTierId) {
      conditions.id = Not(excludeTierId);
    }

    await queryRunner.manager.update(
      TicketTier,
      conditions,
      { [flag]: false },
    );
  }
}