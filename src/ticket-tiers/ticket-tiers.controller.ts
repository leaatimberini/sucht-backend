// backend/src/ticket-tiers/ticket-tiers.controller.ts

import { Controller, Post, Body, Param, Get, UseGuards, Patch, Delete } from '@nestjs/common';
import { TicketTiersService } from './ticket-tiers.service';
import { CreateTicketTierDto } from './dto/create-ticket-tier.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/user.entity';
import { UpdateTicketTierDto } from './dto/update-ticket-tier.dto';

@Controller('events/:eventId/ticket-tiers')
export class TicketTiersController {
  constructor(private readonly ticketTiersService: TicketTiersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(
    @Param('eventId') eventId: string,
    @Body() createTicketTierDto: CreateTicketTierDto,
  ) {
    return this.ticketTiersService.create(eventId, createTicketTierDto);
  }

  @Get()
  findByEvent(@Param('eventId') eventId: string) {
    return this.ticketTiersService.findByEvent(eventId);
  }

  @Patch(':tierId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(
    @Param('tierId') tierId: string,
    @Body() updateTicketTierDto: UpdateTicketTierDto,
  ) {
    return this.ticketTiersService.update(tierId, updateTicketTierDto);
  }

  @Delete(':tierId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('tierId') tierId: string) {
    return this.ticketTiersService.remove(tierId);
  }
}