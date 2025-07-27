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

// --- MÉTODO AÑADIDO ---
// Este endpoint permite al verificador obtener los datos de un ticket antes de canjearlo.
@Get(':id')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.VERIFIER)
findOne(@Param('id') id: string) {
return this.ticketsService.findOne(id);
}

@Post('generate-by-rrpp')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.RRPP)
createByRRPP(@Body() createTicketDto: CreateTicketDto) {
return this.ticketsService.createByRRPP(createTicketDto);
}

@Post('acquire')
acquireForClient(@Request() req, @Body() acquireTicketDto: AcquireTicketDto) {
return this.ticketsService.acquireForClient(req.user, acquireTicketDto);
}

@Post(':id/redeem')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.VERIFIER)
redeemTicket(@Param('id') id: string, @Body() redeemTicketDto: RedeemTicketDto) {
return this.ticketsService.redeemTicket(id, redeemTicketDto.quantity);
}
}
