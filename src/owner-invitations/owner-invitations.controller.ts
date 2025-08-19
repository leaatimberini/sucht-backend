// owner-invitations.controller.ts
import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
import { OwnerInvitationService } from './owner-invitations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../users/user.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@Controller('owner/invitations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN) // Protegemos todo el controlador
export class OwnerInvitationController {
  constructor(private readonly ownerInvitationService: OwnerInvitationService) {}

  /**
   * Endpoint para crear y enviar una invitación especial del Dueño.
   */
  @Post()
  create(
    @Req() req: { user: User },
    @Body() createInvitationDto: CreateInvitationDto,
  ) {
    const owner = req.user;
    return this.ownerInvitationService.createInvitation(owner, createInvitationDto);
  }

  /**
   * NUEVO ENDPOINT: Obtiene el historial de invitaciones enviadas por el Dueño logueado.
   */
  @Get('my-history')
  getMySentInvitations(@Req() req: { user: User }) {
    return this.ownerInvitationService.getMySentInvitations(req.user.id);
  }
}