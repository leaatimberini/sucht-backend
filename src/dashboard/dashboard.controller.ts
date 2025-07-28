import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/user.entity';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard) // Protegemos todas las rutas con login y roles
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @Roles(UserRole.ADMIN) // Solo Admins
  getSummaryMetrics() {
    return this.dashboardService.getSummaryMetrics();
  }

  @Get('event-performance')
  @Roles(UserRole.ADMIN) // Solo Admins
  getEventPerformance() {
    return this.dashboardService.getEventPerformance();
  }

  @Get('rrpp-performance')
  @Roles(UserRole.ADMIN) // Solo Admins
  getRRPPPerformance() {
    return this.dashboardService.getRRPPPerformance();
  }
  
  @Get('my-rrpp-stats')
  @Roles(UserRole.ADMIN, UserRole.RRPP) // Admins y RRPPs
  getMyRRPPStats(@Request() req) {
    const promoterId = req.user.id;
    return this.dashboardService.getMyRRPPStats(promoterId);
  }
}
