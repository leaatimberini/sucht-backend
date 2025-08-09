// backend/src/birthday/birthday.controller.ts

import { Controller, Post, UseGuards, Req, Get, Param, Patch, Body, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BirthdayService } from './birthday.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { IsInt, Min } from 'class-validator';

// --- Data Transfer Objects (DTOs) para Validación ---

class UpdateGuestLimitDto {
  @IsInt()
  @Min(0)
  guestLimit: number;
}

class ClaimEntryDto {
  @IsInt()
  @Min(1)
  guestsEntered: number;
}


@ApiTags('Birthday')
@ApiBearerAuth() // Indica que los endpoints requieren un token JWT
@UseGuards(JwtAuthGuard, RolesGuard) // Protege todas las rutas del controlador
@Controller('birthday')
export class BirthdayController {
  constructor(private readonly birthdayService: BirthdayService) {}

  /**
   * CLIENTE: Reclama su beneficio de cumpleaños para el próximo evento.
   */
  @Post('claim')
  @Roles(UserRole.CLIENT)
  claimBirthdayBenefit(@Req() req) {
    const userId = req.user.id;
    return this.birthdayService.createBirthdayBenefit(userId);
  }
  @Get('my-benefit')
  @Roles(UserRole.CLIENT)
  getMyBirthdayBenefit(@Req() req) {
    const userId = req.user.id;
    return this.birthdayService.findMyBenefitForUpcomingEvent(userId);
  }
  /**
   * ADMIN/OWNER: Obtiene la lista de todos los beneficios de cumpleaños para un evento.
   * Usado en el nuevo panel de "Control de Cumpleaños".
   */
  @Get('admin/event/:eventId')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  getBenefitsForEvent(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.birthdayService.findAllByEvent(eventId);
  }

  /**
   * ADMIN/OWNER: Modifica el límite de invitados de un beneficio específico.
   */
  @Patch('admin/benefit/:benefitId/guest-limit')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  updateGuestLimit(
    @Param('benefitId', ParseUUIDPipe) benefitId: string,
    @Body() updateGuestLimitDto: UpdateGuestLimitDto,
  ) {
    return this.birthdayService.updateGuestLimit(benefitId, updateGuestLimitDto.guestLimit);
  }

  /**
   * VERIFIER: Canjea el QR de INGRESO del cumpleañero y su grupo.
   * Recibe el número exacto de personas para el control de aforo.
   */
  @Post('verifier/benefit/:benefitId/claim-entry')
  @Roles(UserRole.VERIFIER)
  claimEntry(
    @Param('benefitId', ParseUUIDPipe) benefitId: string,
    @Body() claimEntryDto: ClaimEntryDto,
  ) {
    return this.birthdayService.claimEntry(benefitId, claimEntryDto.guestsEntered);
  }

  /**
   * STAFF (ADMIN/OWNER/VERIFIER): Canjea el QR del REGALO (ej. champagne).
   * Puede ser canjeado en la barra por un admin o en la puerta por el verificador.
   */
  @Post('staff/benefit/:benefitId/claim-gift')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.VERIFIER)
  claimGift(@Param('benefitId', ParseUUIDPipe) benefitId: string) {
    return this.birthdayService.claimGift(benefitId);
  }
}