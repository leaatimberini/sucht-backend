import { Controller, Post, Body, Param, UseGuards, Get, Request } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/user.entity';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // --- ENDPOINT AÑADIDO ---
  @Get('my-tickets')
  findMyTickets(@Request() req) {
    // req.user contiene el payload del token (id, email, rol)
    const userId = req.user.id;
    return this.ticketsService.findTicketsByUser(userId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RRPP)
  create(@Body() createTicketDto: CreateTicketDto) {
    return this.ticketsService.create(createTicketDto);
  }

  @Post(':id/verify')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VERIFIER)
  verifyTicket(@Param('id') id: string) {
    return this.ticketsService.verifyTicket(id);
  }
}
