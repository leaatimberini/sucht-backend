import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { DashboardService, DashboardFilters } from './dashboard.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/user.entity';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @Roles(UserRole.ADMIN)
  getSummaryMetrics(@Query() filters: DashboardFilters) {
    return this.dashboardService.getSummaryMetrics(filters);
  }

  @Get('event-performance')
  @Roles(UserRole.ADMIN)
  getEventPerformance(@Query() filters: DashboardFilters) {
    return this.dashboardService.getEventPerformance(filters);
  }

  // --- NUEVO ENDPOINT PARA ADMIN ---
  @Get('rrpp-performance')
  @Roles(UserRole.ADMIN)
  getRRPPPerformance(@Query() filters: DashboardFilters) {
    return this.dashboardService.getRRPPPerformance(filters);
  }
  
  // --- NUEVO ENDPOINT PARA RRPP ---
  @Get('my-rrpp-stats')
  @Roles(UserRole.ADMIN, UserRole.RRPP)
  getMyRRPPStats(@Request() req) {
    const promoterId = req.user.id;
    return this.dashboardService.getMyRRPPStats(promoterId);
  }
}
