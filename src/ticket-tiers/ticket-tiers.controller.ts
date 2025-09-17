// src/ticket-tiers/ticket-tiers.controller.ts

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
  @Roles(UserRole.ADMIN, UserRole.OWNER) // Permitimos a OWNER también
  create(
    @Param('eventId') eventId: string,
    @Body() createTicketTierDto: CreateTicketTierDto,
  ) {
    // FIX: Combinamos el eventId del parámetro con el DTO del body
    // para que coincida con la nueva firma del servicio.
    const fullDto = { ...createTicketTierDto, eventId };
    return this.ticketTiersService.create(fullDto);
  }

  @Get()
  findByEvent(@Param('eventId') eventId: string) {
    return this.ticketTiersService.findByEvent(eventId);
  }

  // --- NUEVO ENDPOINT AÑADIDO ---
  // Este endpoint es público para que los clientes puedan ver las mesas disponibles.
  @Get('vip-tables')
  findVipTiersForEvent(@Param('eventId') eventId: string) {
    return this.ticketTiersService.findVipTiersForEvent(eventId);
  }
  // --- FIN DE NUEVO ENDPOINT ---

  @Patch(':tierId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER) // Permitimos a OWNER también
  update(
    @Param('tierId') tierId: string,
    @Body() updateTicketTierDto: UpdateTicketTierDto,
  ) {
    return this.ticketTiersService.update(tierId, updateTicketTierDto);
  }

  @Delete(':tierId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER) // Permitimos a OWNER también
  remove(@Param('tierId') tierId: string) {
    return this.ticketTiersService.remove(tierId);
  }
}


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