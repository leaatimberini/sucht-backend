import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
import { OrganizerService } from './organizer.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../users/user.entity';
import { CreateOrganizerInvitationDto } from './dto/create-organizer-invitation.dto';

@Controller('organizer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ORGANIZER)
export class OrganizerController {
  constructor(private readonly organizerService: OrganizerService) {}

  @Post('invitations')
  create(
    @Req() req: { user: User },
    @Body() createOrganizerInvitationDto: CreateOrganizerInvitationDto,
  ) {
    const organizer = req.user;
    return this.organizerService.createInvitation(organizer, createOrganizerInvitationDto);
  }

  /**
   * NUEVO ENDPOINT: Obtiene el historial de invitaciones del organizador.
   */
  @Get('invitations/my-history')
  getMySentInvitations(@Req() req: { user: User }) {
    return this.organizerService.getMySentInvitations(req.user.id);
  }
}