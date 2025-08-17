// src/raffles/raffle.controller.ts
import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { RaffleService } from './raffle.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { Public } from '../auth/decorators/public.decorator';

@Controller('raffles')
export class RaffleController {
  constructor(private readonly raffleService: RaffleService) {}

  /**
   * Endpoint PÚBLICO para que el frontend obtenga el estado del sorteo de un evento
   * (para el contador y para mostrar el premio).
   */
  @Public()
  @Get('status/:eventId')
  getRaffleStatus(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.raffleService.getRaffleStatusForEvent(eventId);
  }

  /**
   * Endpoint para que el ADMIN vea el historial de ganadores.
   */
  @Get('history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  getHistory() {
    return this.raffleService.getHistory();
  }

  /**
   * Endpoint para que el ADMIN pueda disparar un sorteo manualmente para pruebas.
   */
  @Post('trigger-draw/:eventId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  triggerDraw(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.raffleService.performDraw(eventId);
  }
}