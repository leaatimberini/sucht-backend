// src/dashboard/dashboard.controller.ts

import { Controller, Get, UseGuards, Request, Query, ParseIntPipe } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
// CAMBIO: Ya no importamos 'DashboardFilters' desde el servicio.
// import { DashboardFilters } from './dashboard.service'; 

// MANTENIDO: Tus guardias y decoradores originales.
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/user.entity';

// CAMBIO: Importamos nuestro nuevo DTO para la validación.
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @Roles(UserRole.ADMIN, UserRole.OWNER) // ROL CORREGIDO: Generalmente OWNER también ve esto.
  // CAMBIO: Usamos el DTO para validar los filtros.
  getSummaryMetrics(@Query() queryDto: DashboardQueryDto) {
    // El ValidationPipe global se encarga de la magia.
    return this.dashboardService.getSummaryMetrics(queryDto);
  }

  @Get('event-performance')
  @Roles(UserRole.ADMIN, UserRole.OWNER) // ROL CORREGIDO
  // CAMBIO: Usamos el DTO aquí también para consistencia.
  getEventPerformance(@Query() queryDto: DashboardQueryDto) {
    return this.dashboardService.getEventPerformance(queryDto);
  }

  @Get('rrpp-performance')
  @Roles(UserRole.ADMIN, UserRole.OWNER) // ROL CORREGIDO
  // CAMBIO PRINCIPAL: Este es el endpoint que fallaba. Ahora usa el DTO.
  getRRPPPerformance(@Query() queryDto: DashboardQueryDto) {
    return this.dashboardService.getRRPPPerformance(queryDto);
  }
  
  // MANTENIDO: Este endpoint está bien como estaba.
  @Get('my-rrpp-stats')
  @Roles(UserRole.RRPP) // ROL CORREGIDO: ADMIN no necesita esta ruta, tiene la global.
  getMyRRPPStats(@Request() req) {
    const promoterId = req.user.id;
    return this.dashboardService.getMyRRPPStats(promoterId);
  }

  // MANTENIDO: Este endpoint no usa filtros, se queda como está.
  @Get('no-shows')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  getNoShows() {
    return this.dashboardService.getNoShows();
  }

  // MANTENIDO: Este endpoint está bien como estaba.
  @Get('loyalty/attendance-ranking')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  getAttendanceRanking(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.dashboardService.getAttendanceRanking(limit);
  }
}