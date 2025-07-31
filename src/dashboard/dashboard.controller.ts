import { Controller, Get, UseGuards, Request, Query, ParseIntPipe } from '@nestjs/common';
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

  @Get('rrpp-performance')
  @Roles(UserRole.ADMIN)
  getRRPPPerformance(@Query() filters: DashboardFilters) {
    return this.dashboardService.getRRPPPerformance(filters);
  }
  
  @Get('my-rrpp-stats')
  @Roles(UserRole.ADMIN, UserRole.RRPP)
  getMyRRPPStats(@Request() req) {
    const promoterId = req.user.id;
    return this.dashboardService.getMyRRPPStats(promoterId);
  }

  @Get('no-shows')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  getNoShows() {
    return this.dashboardService.getNoShows();
  }


  @Get('loyalty/attendance-ranking')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  getAttendanceRanking(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.dashboardService.getAttendanceRanking(limit);
  }
}