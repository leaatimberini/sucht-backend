// backend/src/birthday/birthday.service.ts

import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BirthdayBenefit } from './birthday-benefit.entity';
import { UsersService } from '../users/users.service';
import { EventsService } from '../events/events.service';
import { set } from 'date-fns';
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
   * CLIENTE: Crea el beneficio de cumpleaños, especificando el número de invitados.
   */
  async createBirthdayBenefit(userId: string, guestLimit: number): Promise<BirthdayBenefit> {
    const user = await this.usersService.findOneById(userId);
    // NOTA: Podríamos re-habilitar la comprobación de isBirthdayWeek si es necesario.
    
    const upcomingEvent = await this.eventsService.findNextUpcomingEvent();
    if (!upcomingEvent) {
      throw new NotFoundException('No hay eventos próximos para asociar el beneficio.');
    }

    const existingBenefit = await this.birthdayBenefitRepository.findOne({ where: { userId, eventId: upcomingEvent.id } });
    if (existingBenefit) {
      throw new ConflictException('Ya has reclamado tu beneficio para este evento.');
    }
    if (guestLimit < 0) throw new BadRequestException('El número de invitados no puede ser negativo.');

    const timeZone = 'America/Argentina/Buenos_Aires';
    const eventDateInTz = toZonedTime(upcomingEvent.startDate, timeZone);
    const expiresAt = set(eventDateInTz, { hours: 3, minutes: 0, seconds: 0, milliseconds: 0 });

    const newBenefit = this.birthdayBenefitRepository.create({
      userId,
      eventId: upcomingEvent.id,
      guestLimit, // Se guarda el límite que eligió el cliente
      expiresAt,
      // Los campos entryQrId y giftQrId son generados automáticamente por la BBDD
    });

    return this.birthdayBenefitRepository.save(newBenefit);
  }

  /**
   * CLIENTE: Actualiza el límite de invitados. Tiene un máximo de 2 intentos.
   */
  async updateGuestLimitByClient(userId: string, newLimit: number): Promise<BirthdayBenefit> {
    const benefit = await this.findMyBenefitForUpcomingEvent(userId);
    if (!benefit) {
        throw new NotFoundException('No se encontró un beneficio de cumpleaños activo para actualizar.');
    }
    if (benefit.updatesRemaining <= 0) {
      throw new ForbiddenException('Has alcanzado el límite de modificaciones para tu beneficio.');
    }
    if (newLimit < 0) {
      throw new BadRequestException('El número de invitados no puede ser negativo.');
    }

    benefit.guestLimit = newLimit;
    benefit.updatesRemaining -= 1; // Decrementamos el contador
    return this.birthdayBenefitRepository.save(benefit);
  }

  /**
   * ADMIN: Actualiza el límite de invitados sin restricciones.
   */
  async updateGuestLimitByAdmin(benefitId: string, newLimit: number): Promise<BirthdayBenefit> {
    const benefit = await this.findById(benefitId);
    if (newLimit < 0) {
      throw new BadRequestException('El número de invitados no puede ser negativo.');
    }
    benefit.guestLimit = newLimit;
    return this.birthdayBenefitRepository.save(benefit);
  }

  /**
   * VERIFIER (PUERTA): Canjea la ENTRADA usando el entryQrId.
   */
  async claimEntry(entryQrId: string, guestsEntered: number): Promise<BirthdayBenefit> {
    const benefit = await this.birthdayBenefitRepository.findOne({ where: { entryQrId } });
    if (!benefit) throw new NotFoundException('QR de ingreso no válido.');
    if (benefit.isEntryClaimed) throw new ConflictException('Este beneficio de ingreso ya fue canjeado.');
    if (new Date() > benefit.expiresAt) throw new BadRequestException('Este beneficio ha expirado.');
    if (guestsEntered > benefit.guestLimit + 1) throw new BadRequestException(`El límite de invitados (${benefit.guestLimit}) ha sido superado.`);

    benefit.isEntryClaimed = true;
    benefit.entryClaimedAt = new Date();
    benefit.guestsEntered = guestsEntered;
    return this.birthdayBenefitRepository.save(benefit);
  }

  /**
   * BARRA/ADMIN: Canjea el REGALO usando el giftQrId.
   */
  async claimGift(giftQrId: string): Promise<BirthdayBenefit> {
    const benefit = await this.birthdayBenefitRepository.findOne({ where: { giftQrId } });
    if (!benefit) throw new NotFoundException('QR de regalo no válido.');
    if (benefit.isGiftClaimed) throw new ConflictException('Este regalo ya fue canjeado.');
    if (!benefit.isEntryClaimed) throw new BadRequestException('El grupo debe ingresar al evento antes de reclamar el regalo.');

    benefit.isGiftClaimed = true;
    benefit.giftClaimedAt = new Date();
    return this.birthdayBenefitRepository.save(benefit);
  }

  /**
   * ADMIN: Obtiene todos los beneficios de cumpleaños para un evento específico.
   */
  async findAllByEvent(eventId: string): Promise<BirthdayBenefit[]> {
    return this.birthdayBenefitRepository.find({
      where: { eventId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * CLIENTE: Busca si ya existe un beneficio activo para el próximo evento.
   */
  async findMyBenefitForUpcomingEvent(userId: string): Promise<BirthdayBenefit | null> {
    const upcomingEvent = await this.eventsService.findNextUpcomingEvent();
    if (!upcomingEvent) return null;
    return this.birthdayBenefitRepository.findOne({ where: { userId, eventId: upcomingEvent.id }, relations: ['event'] });
  }

  /**
   * Método auxiliar para encontrar un beneficio por su ID principal.
   */
  async findById(id: string): Promise<BirthdayBenefit> {
    const benefit = await this.birthdayBenefitRepository.findOne({ where: { id } });
    if (!benefit) throw new NotFoundException(`Beneficio de cumpleaños con ID "${id}" no encontrado.`);
    return benefit;
  }
}