// src/owner-invitations/owner-invitations.controller.ts

import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OwnerInvitationService } from './owner-invitations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../users/user.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator'; // <-- RUTA CORREGIDA


@ApiTags('Owner Invitations')
@ApiBearerAuth()
@Controller('owner-invitations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
export class OwnerInvitationsController {
  constructor(
    private readonly ownerInvitationService: OwnerInvitationService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create and send a special invitation from the Owner',
    description:
      'Allows the Owner or Admin to create a special invitation that can include a free ticket and/or gifted products for a specific event.',
  })
  create(
    @CurrentUser() owner: User,
    @Body() createInvitationDto: CreateInvitationDto,
  ) {
    return this.ownerInvitationService.createInvitation(
      owner,
      createInvitationDto,
    );
  }

  @Get('my-history')
  @ApiOperation({
    summary: "Get the logged-in Owner's sent invitation history",
    description:
      'Retrieves a consolidated list of all invitations and gifts sent by the currently authenticated Owner or Admin.',
  })
  getMySentInvitations(@CurrentUser() owner: User) {
    return this.ownerInvitationService.getMySentInvitations(owner.id);
  }
}