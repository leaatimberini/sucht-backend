import { Controller, Post, Body, Param, Get, UseGuards } from '@nestjs/common';
import { TicketTiersService } from './ticket-tiers.service';
import { CreateTicketTierDto } from './dto/create-ticket-tier.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/user.entity';

@Controller('events/:eventId/ticket-tiers') // Anidamos la ruta bajo eventos
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketTiersController {
  constructor(private readonly ticketTiersService: TicketTiersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(
    @Param('eventId') eventId: string,
    @Body() createTicketTierDto: CreateTicketTierDto,
  ) {
    return this.ticketTiersService.create(eventId, createTicketTierDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RRPP) // Admins y RRPPs pueden ver los tipos de entrada
  findByEvent(@Param('eventId') eventId: string) {
    return this.ticketTiersService.findByEvent(eventId);
  }
}