import { Controller, Post, Body, Param, UseGuards, Get, Request, Query } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/user.entity';
import { AcquireTicketDto } from './dto/acquire-ticket.dto';
import { RedeemTicketDto } from './dto/redeem-ticket.dto';
import { DashboardQueryDto } from 'src/dashboard/dto/dashboard-query.dto';

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

  // --- NUEVOS ENDPOINTS PARA EL PANEL DE VERIFICADOR ---
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
  // --- FIN DE NUEVOS ENDPOINTS ---

  @Get('my-tickets')
  findMyTickets(@Request() req) {
    const userId = req.user.id;
    return this.ticketsService.findTicketsByUser(userId);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VERIFIER)
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Post(':id/confirm-attendance')
  confirmAttendance(@Request() req, @Param('id') id: string) {
    const userId = req.user.id;
    return this.ticketsService.confirmAttendance(id, userId);
  }

  @Post('generate-by-rrpp')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RRPP)
  createByRRPP(@Request() req, @Body() createTicketDto: CreateTicketDto) {
    return this.ticketsService.createByRRPP(createTicketDto, req.user);
  }

  @Post('acquire')
  acquireForClient(@Request() req, @Body() acquireTicketDto: AcquireTicketDto & { promoterUsername?: string }) {
    return this.ticketsService.acquireForClient(req.user, acquireTicketDto, acquireTicketDto.promoterUsername);
  }

  @Post(':id/redeem')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VERIFIER)
  redeemTicket(@Param('id') id: string, @Body() redeemTicketDto: RedeemTicketDto) {
    return this.ticketsService.redeemTicket(id, redeemTicketDto.quantity);
  }
}