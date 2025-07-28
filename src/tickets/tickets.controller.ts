import { Controller, Post, Body, Param, UseGuards, Get, Request } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/user.entity';
import { AcquireTicketDto } from './dto/acquire-ticket.dto';
import { RedeemTicketDto } from './dto/redeem-ticket.dto';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

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

  // --- ENDPOINT AÑADIDO ---
  @Post(':id/confirm-attendance')
  // No necesita RolesGuard porque cualquier usuario logueado puede confirmar su propia entrada
  confirmAttendance(@Request() req, @Param('id') id: string) {
    const userId = req.user.id;
    return this.ticketsService.confirmAttendance(id, userId);
  }

  @Post('generate-by-rrpp')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RRPP)
  createByRRPP(@Request() req, @Body() createTicketDto: CreateTicketDto) {
    // Pasamos el usuario RRPP completo para obtener su username
    return this.ticketsService.createByRRPP(createTicketDto, req.user);
  }

  @Post('acquire')
  acquireForClient(@Request() req, @Body() acquireTicketDto: AcquireTicketDto & { promoterUsername?: string }) {
    // El 'user' viene del token JWT
    return this.ticketsService.acquireForClient(req.user, acquireTicketDto, acquireTicketDto.promoterUsername);
  }

  @Post(':id/redeem')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VERIFIER)
  redeemTicket(@Param('id') id: string, @Body() redeemTicketDto: RedeemTicketDto) {
    return this.ticketsService.redeemTicket(id, redeemTicketDto.quantity);
  }
}
