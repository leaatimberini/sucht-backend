// backend/src/birthday/birthday.service.ts

import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BirthdayBenefit } from './birthday-benefit.entity';
import { UsersService } from '../users/users.service';
import { EventsService } from '../events/events.service';
import { User } from '../users/user.entity';
import { startOfWeek, endOfWeek, isWithinInterval, set, getYear } from 'date-fns';
// CORRECCIÓN 1: Importamos 'toZonedTime' en lugar de 'utcToZonedTime'
import { toZonedTime } from 'date-fns-tz';

@Injectable()
export class BirthdayService {
  constructor(
    @InjectRepository(BirthdayBenefit)
    private readonly birthdayBenefitRepository: Repository<BirthdayBenefit>,
    private readonly usersService: UsersService,
    private readonly eventsService: EventsService,
  ) {}

  /**
   * Lógica Central: Crea el beneficio de cumpleaños para un usuario.
   * Se asocia automáticamente al próximo evento activo.
   */
  async createBirthdayBenefit(userId: string): Promise<BirthdayBenefit> {
    const user = await this.usersService.findOneById(userId);
    if (!this.isBirthdayWeek(user.dateOfBirth)) {
      throw new BadRequestException('No estás en tu semana de cumpleaños.');
    }

    const upcomingEvent = await this.eventsService.findNextUpcomingEvent();
    if (!upcomingEvent) {
      throw new NotFoundException('No hay eventos próximos para asociar el beneficio.');
    }

    const existingBenefit = await this.birthdayBenefitRepository.findOne({
      where: { userId, eventId: upcomingEvent.id },
    });

    if (existingBenefit) {
      throw new ConflictException('Ya has reclamado tu beneficio para este evento.');
    }

    const timeZone = 'America/Argentina/Buenos_Aires';
    // CORRECCIÓN 2: Usamos 'upcomingEvent.startDate' en lugar de '.date'
    // Y usamos 'toZonedTime'
    const eventDateInTz = toZonedTime(upcomingEvent.startDate, timeZone);
    const expiresAt = set(eventDateInTz, { hours: 3, minutes: 0, seconds: 0, milliseconds: 0 });

    const newBenefit = this.birthdayBenefitRepository.create({
      userId,
      eventId: upcomingEvent.id,
      description: `Beneficio de Cumpleaños para ${user.name}`,
      guestLimit: 10,
      expiresAt,
    });

    return this.birthdayBenefitRepository.save(newBenefit);
  }

  /**
   * Endpoint para el Admin: Obtiene todos los beneficios de cumpleaños para un evento específico.
   */
  async findAllByEvent(eventId: string): Promise<BirthdayBenefit[]> {
    return this.birthdayBenefitRepository.find({
      where: { eventId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Endpoint para el Admin: Actualiza el límite de invitados de un beneficio.
   */
  async updateGuestLimit(benefitId: string, newLimit: number): Promise<BirthdayBenefit> {
    const benefit = await this.findById(benefitId);
    if (newLimit < 0) {
      throw new BadRequestException('El límite de invitados no puede ser negativo.');
    }
    benefit.guestLimit = newLimit;
    return this.birthdayBenefitRepository.save(benefit);
  }

  /**
   * Endpoint para el Verificador: Canjea el beneficio de INGRESO.
   */
  async claimEntry(benefitId: string, guestsEntered: number): Promise<BirthdayBenefit> {
    const benefit = await this.findById(benefitId);
    if (benefit.isEntryClaimed) {
      throw new ConflictException('Este beneficio de ingreso ya fue canjeado.');
    }
    if (new Date() > benefit.expiresAt) {
      throw new BadRequestException('Este beneficio ha expirado.');
    }
    if (guestsEntered > benefit.guestLimit + 1) {
        throw new BadRequestException(`El límite de invitados (${benefit.guestLimit}) ha sido superado.`);
    }

    benefit.isEntryClaimed = true;
    benefit.entryClaimedAt = new Date();
    benefit.guestsEntered = guestsEntered;

    return this.birthdayBenefitRepository.save(benefit);
  }

  /**
   * Endpoint para la Barra/Admin: Canjea el beneficio de REGALO (ej. Champagne).
   */
  async claimGift(benefitId: string): Promise<BirthdayBenefit> {
    const benefit = await this.findById(benefitId);
    if (benefit.isGiftClaimed) {
      throw new ConflictException('Este regalo ya fue canjeado.');
    }
     if (!benefit.isEntryClaimed) {
      throw new BadRequestException('El grupo debe ingresar al evento antes de reclamar el regalo.');
    }

    benefit.isGiftClaimed = true;
    benefit.giftClaimedAt = new Date();

    return this.birthdayBenefitRepository.save(benefit);
  }
  
  /**
   * Método auxiliar para encontrar un beneficio por su ID.
   */
  async findById(id: string): Promise<BirthdayBenefit> {
    const benefit = await this.birthdayBenefitRepository.findOne({ where: { id } });
    if (!benefit) {
      throw new NotFoundException(`Beneficio de cumpleaños con ID "${id}" no encontrado.`);
    }
    return benefit;
  }
    async findMyBenefitForUpcomingEvent(userId: string): Promise<BirthdayBenefit | null> {
    const upcomingEvent = await this.eventsService.findNextUpcomingEvent();
    if (!upcomingEvent) {
      return null; // Si no hay evento, no hay beneficio
    }

    const benefit = await this.birthdayBenefitRepository.findOne({
      where: { userId, eventId: upcomingEvent.id },
      relations: ['event'], // Devolvemos la info del evento
    });

    return benefit;
  }

  
  /**
   * Determina si la fecha actual está dentro de la semana de cumpleaños del usuario.
   * La semana se considera de Domingo a Sábado.
   */
  private isBirthdayWeek(dateOfBirth: Date | null): boolean {
    if (!dateOfBirth) return false;

    const timeZone = 'America/Argentina/Buenos_Aires';
    // CORRECCIÓN 1: Usamos 'toZonedTime'
    const nowInTz = toZonedTime(new Date(), timeZone);
    const birthdayThisYear = set(dateOfBirth, { year: getYear(nowInTz) });
    const start = startOfWeek(birthdayThisYear, { weekStartsOn: 0 });
    const end = endOfWeek(birthdayThisYear, { weekStartsOn: 0 });

    return isWithinInterval(nowInTz, { start, end });
  }
}