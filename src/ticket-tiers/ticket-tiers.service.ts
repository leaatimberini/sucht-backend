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
  ) { }

  async create(createTicketTierDto: CreateTicketTierDto): Promise<TicketTier> {
    const { eventId } = createTicketTierDto;
    const event = await this.eventsService.findOne(eventId);

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
      where: {
        event: { id: eventId },
        isPubliclyListed: true, // ¡FILTRO IMPORTANTE!
      },
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

  async findVipTiersForEvent(eventId: string): Promise<TicketTier[]> {
    return this.ticketTiersRepository.find({
      where: {
        event: { id: eventId },
        productType: ProductType.VIP_TABLE,
      },
      order: {
        tableNumber: 'ASC',
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
        isPubliclyListed: true, // Buscamos un tier público gratuito como base
      },
      order: {
        createdAt: 'ASC',
      }
    });
  }

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

  // --- NUEVO MÉTODO PARA PRECIOS POR SECTOR ---
  async ensureTierForCategory(eventId: string, tableCategoryId: string, price: number, categoryName: string, capacity?: number, depositPrice?: number): Promise<TicketTier> {
    let tier = await this.ticketTiersRepository.findOne({ where: { eventId, tableCategoryId } });

    const payload = {
      eventId,
      tableCategoryId,
      price,
      name: `Sector ${categoryName}`,
      productType: ProductType.VIP_TABLE,
      isPubliclyListed: true, // Visible for purchase
      quantity: 100, // Arbitrary high number, capacity handled by table count usually
      capacity: capacity || undefined,
      allowPartialPayment: (depositPrice !== undefined && depositPrice > 0),
      partialPaymentPrice: depositPrice || null,
    };

    if (tier) {
      if (
        Number(tier.price) !== Number(price) ||
        tier.capacity !== capacity ||
        Number(tier.partialPaymentPrice) !== Number(depositPrice)
      ) {
        tier = await this.ticketTiersRepository.save({ ...tier, ...payload });
      }
    } else {
      tier = await this.ticketTiersRepository.save(this.ticketTiersRepository.create(payload));
    }
    return tier;
  }
}