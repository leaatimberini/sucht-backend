// backend/src/birthday-benefits/birthday-benefits.service.ts

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BirthdayBenefit, BirthdayBenefitType } from './birthday-benefit.entity';
import { User } from 'src/users/user.entity';
import { TicketsService } from 'src/tickets/tickets.service';
import { ConfigurationService } from 'src/configuration/configuration.service';
import { CreateBirthdayBenefitDto } from './dto/create-birthday-benefit.dto';
import { TicketTier } from 'src/ticket-tiers/ticket-tier.entity';
import { Event } from 'src/events/event.entity';
import { Ticket } from 'src/tickets/ticket.entity';

@Injectable()
export class BirthdayBenefitsService {
  private readonly logger = new Logger(BirthdayBenefitsService.name);

  constructor(
    @InjectRepository(BirthdayBenefit)
    private birthdayBenefitsRepository: Repository<BirthdayBenefit>,
    @InjectRepository(TicketTier)
    private ticketTiersRepository: Repository<TicketTier>,
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
    private ticketsService: TicketsService,
    private configurationService: ConfigurationService,
  ) {}

  /**
   * Verifica si un usuario ya ha reclamado un tipo de beneficio de cumpleaños este año.
   */
  private async findBenefitForCurrentYear(userId: string, type: BirthdayBenefitType): Promise<BirthdayBenefit | null> {
    const currentYear = new Date().getFullYear();
    return this.birthdayBenefitsRepository.findOne({
      where: {
        userId,
        type,
        year: currentYear,
      },
    });
  }

  /**
   * Crea el beneficio de ingreso grupal para el cumpleañero.
   */
  async createGroupEntryBenefit(user: User, dto: CreateBirthdayBenefitDto): Promise<Ticket> {
    this.logger.log(`[createGroupEntryBenefit] Usuario ${user.email} reclamando beneficio de ingreso para ${dto.guestCount} invitados.`);
    const existingBenefit = await this.findBenefitForCurrentYear(user.id, BirthdayBenefitType.GROUP_ENTRY);
    if (existingBenefit) {
      throw new BadRequestException('Ya has reclamado tu beneficio de ingreso grupal este año.');
    }

    // Buscamos un tipo de entrada "especial" para cumpleaños. Esto debe ser creado por el admin.
    const birthdayTier = await this.ticketTiersRepository.findOne({ where: { name: 'CUMPLEAÑOS_INGRESO_ESPECIAL' } });
    if (!birthdayTier) {
      throw new NotFoundException('No se encontró la configuración para el ingreso de cumpleaños.');
    }
    
    // El DTO debe incluir el eventId para el cual se reclama el beneficio
    const event = await this.eventsRepository.findOneBy({ id: dto.eventId });
     if (!event) throw new NotFoundException('Evento no encontrado.');

    const ticketData = {
      eventId: event.id,
      ticketTierId: birthdayTier.id,
      quantity: dto.guestCount + 1, // Cumpleañero + invitados
    };
    
    // Creamos un ticket especial que funcionará como QR grupal
    const groupTicket = await this.ticketsService.acquireForClient(user, ticketData, null, 0, null);

    const benefit = this.birthdayBenefitsRepository.create({
      user,
      userId: user.id,
      type: BirthdayBenefitType.GROUP_ENTRY,
      year: new Date().getFullYear(),
      ticket: groupTicket, // Vinculamos el ticket al beneficio
    });
    await this.birthdayBenefitsRepository.save(benefit);
    
    this.logger.log(`[createGroupEntryBenefit] Beneficio de ingreso grupal creado para ${user.email}. Ticket ID: ${groupTicket.id}`);
    return groupTicket;
  }

  /**
   * Crea el beneficio del champagne de regalo.
   */
  async createChampagneGiftBenefit(user: User): Promise<BirthdayBenefit> {
    this.logger.log(`[createChampagneGiftBenefit] Usuario ${user.email} reclamando champagne de regalo.`);
    const existingBenefit = await this.findBenefitForCurrentYear(user.id, BirthdayBenefitType.CHAMPAGNE_GIFT);
    if (existingBenefit) {
      throw new BadRequestException('Ya has reclamado tu champagne de regalo este año.');
    }

    const benefit = this.birthdayBenefitsRepository.create({
      user,
      userId: user.id,
      type: BirthdayBenefitType.CHAMPAGNE_GIFT,
      year: new Date().getFullYear(),
    });
    
    const savedBenefit = await this.birthdayBenefitsRepository.save(benefit);
    this.logger.log(`[createChampagneGiftBenefit] Beneficio de champagne creado para ${user.email}. Beneficio ID: ${savedBenefit.id}`);
    return savedBenefit;
  }
}