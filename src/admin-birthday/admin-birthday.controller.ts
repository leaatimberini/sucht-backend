import { Controller, Get, UseGuards, Query, ParseUUIDPipe, Patch, Param, Body } from '@nestjs/common';
import { AdminBirthdayService } from './admin-birthday.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { IsInt, Min } from 'class-validator';

// DTO para validar el cuerpo de la petición de actualización
class UpdateGuestLimitDto {
  @IsInt()
  @Min(0)
  guestLimit: number;
}

@Controller('admin/birthday')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OWNER) // Protegemos todo el controlador para admins/dueños
export class AdminBirthdayController {
  constructor(private readonly adminBirthdayService: AdminBirthdayService) {}

  /**
   * Obtiene el resumen de beneficios de cumpleaños para un evento específico.
   * Se accede a través de GET /api/admin/birthday/summary?eventId=...
   */
  @Get('summary')
  getSummary(@Query('eventId', ParseUUIDPipe) eventId: string) {
    return this.adminBirthdayService.getBirthdayBenefitsSummary(eventId);
  }

  /**
   * Actualiza el límite de invitados de un ticket de cumpleaños específico.
   * Se accede a través de PATCH /api/admin/birthday/ticket/:ticketId
   */
  @Patch('ticket/:ticketId')
  updateGuestLimit(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Body() updateGuestLimitDto: UpdateGuestLimitDto,
  ) {
    return this.adminBirthdayService.updateGuestLimit(ticketId, updateGuestLimitDto.guestLimit);
  }
}