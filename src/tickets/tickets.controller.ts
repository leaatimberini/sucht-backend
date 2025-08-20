// backend/src/tickets/tickets.controller.ts

import { Controller, Post, Body, Param, UseGuards, Get, Request, Query, Delete, HttpCode, HttpStatus, NotFoundException, ParseUUIDPipe } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/user.entity';
import { AcquireTicketDto } from './dto/acquire-ticket.dto';
import { RedeemTicketDto } from './dto/redeem-ticket.dto';
import { DashboardQueryDto } from 'src/dashboard/dto/dashboard-query.dto';
import { User } from 'src/users/user.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get('history/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  getFullHistory(@Query() filters: DashboardQueryDto) {
    return this.ticketsService.getFullHistory(filters);
  }

  @Get('scan-history/:eventId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VERIFIER)
  getScanHistory(@Param('eventId') eventId: string) {
    return this.ticketsService.getScanHistory(eventId);
  }

  @Get('premium-products/:eventId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VERIFIER)
  getPremiumProducts(@Param('eventId') eventId: string) {
    return this.ticketsService.getPremiumProducts(eventId);
  }

  @Get('my-tickets')
  findMyTickets(@Request() req: { user: User }) {
    const userId = req.user.id;
    return this.ticketsService.findTicketsByUser(userId);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VERIFIER)
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Post('generate-by-rrpp')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RRPP)
  createByRRPP(@Request() req: { user: User }, @Body() createTicketDto: CreateTicketDto) {
    return this.ticketsService.createByRRPP(createTicketDto, req.user);
  }
  @Post(':id/confirm-attendance')
  confirmAttendance(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    return this.ticketsService.confirmAttendance(id, req.user.id);
  }
  // --- Endpoint para que el cliente adquiera un ticket gratuito ---
  @Post('acquire')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.RRPP, UserRole.ADMIN, UserRole.OWNER) // Permitimos a más roles adquirir
  acquireForClient(@Request() req: { user: User }, @Body() acquireTicketDto: AcquireTicketDto) {
    // ===== CORRECCIÓN FINAL Y DEFINITIVA =====
    // Ahora pasamos el promoterUsername que viene en el body de la petición.
    // Usamos '?? null' para asegurar que si es undefined, se pase como null.
    return this.ticketsService.acquireForClient(
      req.user, 
      acquireTicketDto, 
      acquireTicketDto.promoterUsername ?? null, 
      0, 
      null
    );
  }
  
  @Post(':id/redeem')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VERIFIER)
  redeemTicket(@Param('id') id: string, @Body() redeemTicketDto: RedeemTicketDto) {
    return this.ticketsService.redeemTicket(id, redeemTicketDto.quantity);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTicket(@Param('id') id: string) {
    const deleted = await this.ticketsService.deleteTicket(id);
    if (!deleted) {
      throw new NotFoundException(`Ticket with ID "${id}" not found.`);
    }
    return;
  }
}