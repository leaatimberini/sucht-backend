import { Controller, Post, Body, Param, Get, UseGuards } from '@nestjs/common';
import { TicketTiersService } from './ticket-tiers.service';
import { CreateTicketTierDto } from './dto/create-ticket-tier.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/user.entity';

// CORRECCIÓN: Quitamos los guardias de aquí para no proteger todo el controlador
@Controller('events/:eventId/ticket-tiers')
export class TicketTiersController {
constructor(private readonly ticketTiersService: TicketTiersService) {}

@Post()
// Y los ponemos aquí, para proteger solo la creación
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
create(
@Param('eventId') eventId: string,
@Body() createTicketTierDto: CreateTicketTierDto,
) {
return this.ticketTiersService.create(eventId, createTicketTierDto);
}

@Get()
// Esta ruta ahora es pública y cualquiera puede ver los tipos de entrada
findByEvent(@Param('eventId') eventId: string) {
return this.ticketTiersService.findByEvent(eventId);
}
}