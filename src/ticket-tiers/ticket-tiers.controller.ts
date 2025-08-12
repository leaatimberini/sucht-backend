import { Controller, Post, Body, Param, Get, UseGuards, Patch, Delete } from '@nestjs/common';
import { TicketTiersService } from './ticket-tiers.service';
import { CreateTicketTierDto } from './dto/create-ticket-tier.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/user.entity';
import { UpdateTicketTierDto } from './dto/update-ticket-tier.dto';

// Este controlador maneja las rutas anidadas bajo un evento específico
// EJ: /api/events/EVENTO_ID/ticket-tiers
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


// --- NUEVO CONTROLADOR AÑADIDO ---
// Este controlador maneja rutas a nivel raíz de "ticket-tiers"
// EJ: /api/ticket-tiers/giftable-products
@Controller('ticket-tiers')
export class RootTicketTiersController {
    constructor(private readonly ticketTiersService: TicketTiersService) {}

    @Get('giftable-products')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.OWNER, UserRole.ADMIN)
    findGiftableProducts() {
      return this.ticketTiersService.findGiftableProducts();
    }
}