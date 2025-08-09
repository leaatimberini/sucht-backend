import { Controller, Post, UseGuards, Req, Get, Param, Patch, Body, ParseUUIDPipe } from '@nestjs/common';
import { BirthdayService } from './birthday.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { IsInt, Min } from 'class-validator';

// --- Data Transfer Objects (DTOs) para Validación ---
class CreateBenefitDto {
  @IsInt()
  @Min(0)
  guestLimit: number;
}

class UpdateGuestLimitDto {
  @IsInt()
  @Min(0)
  guestLimit: number;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('birthday')
export class BirthdayController {
  constructor(private readonly birthdayService: BirthdayService) {}

  /**
   * CLIENTE: Reclama su beneficio, especificando el número de invitados.
   */
  @Post('claim')
  @Roles(UserRole.CLIENT)
  claimBirthdayBenefit(@Req() req, @Body() createBenefitDto: CreateBenefitDto) {
    const userId = req.user.id;
    return this.birthdayService.createBirthdayBenefit(userId, createBenefitDto.guestLimit);
  }
  
  /**
   * CLIENTE: Actualiza la cantidad de invitados de su beneficio.
   */
  @Patch('my-benefit/guest-limit')
  @Roles(UserRole.CLIENT)
  updateMyGuestLimit(@Req() req, @Body() updateGuestLimitDto: UpdateGuestLimitDto) {
    const userId = req.user.id;
    return this.birthdayService.updateGuestLimitByClient(userId, updateGuestLimitDto.guestLimit);
  }

  /**
   * CLIENTE: Obtiene su beneficio de cumpleaños activo, si existe.
   */
  @Get('my-benefit')
  @Roles(UserRole.CLIENT)
  getMyBirthdayBenefit(@Req() req) {
    const userId = req.user.id;
    return this.birthdayService.findMyBenefitForUpcomingEvent(userId);
  }

  /**
   * ADMIN/OWNER: Obtiene la lista de todos los beneficios para un evento.
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
  updateGuestLimitByAdmin(
    @Param('benefitId', ParseUUIDPipe) benefitId: string,
    @Body() updateGuestLimitDto: UpdateGuestLimitDto,
  ) {
    return this.birthdayService.updateGuestLimitByAdmin(benefitId, updateGuestLimitDto.guestLimit);
  }

  /**
   * VERIFIER (PUERTA): Canjea la ENTRADA usando el entryQrId.
   */
  @Post('validate-entry/:entryQrId')
  @Roles(UserRole.VERIFIER, UserRole.ADMIN, UserRole.OWNER)
  async validateEntry(
    @Param('entryQrId', ParseUUIDPipe) entryQrId: string,
    @Body('guestsEntered') guestsEntered: number,
  ) {
    return this.birthdayService.claimEntry(entryQrId, guestsEntered);
  }

  /**
   * BARRA/ADMIN: Canjea el REGALO usando el giftQrId.
   */
  @Post('validate-gift/:giftQrId')
  @Roles(UserRole.VERIFIER, UserRole.ADMIN, UserRole.OWNER, UserRole.BARRA)
  async validateGift(@Param('giftQrId', ParseUUIDPipe) giftQrId: string) {
    return this.birthdayService.claimGift(giftQrId);
  }
}