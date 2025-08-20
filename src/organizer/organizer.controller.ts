// src/organizer/organizer.controller.ts
import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
import { OrganizerService } from './organizer.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../users/user.entity';
import { CreateOrganizerInvitationDto } from './dto/create-organizer-invitation.dto'; // 1. Importar el DTO correcto

@Controller('organizer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ORGANIZER)
export class OrganizerController {
  constructor(private readonly organizerService: OrganizerService) {}

  /**
   * Endpoint para que un Organizador cree y envíe una invitación.
   */
  @Post('invitations')
  create(
    @Req() req: { user: User },
    @Body() createOrganizerInvitationDto: CreateOrganizerInvitationDto, // 2. Usar el nuevo DTO
  ) {
    const organizer = req.user;
    return this.organizerService.createInvitation(organizer, createOrganizerInvitationDto);
  }
}