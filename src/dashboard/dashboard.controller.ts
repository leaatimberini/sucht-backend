// src/dashboard/dashboard.controller.ts
import { Controller, Get, UseGuards, Request, Query, BadRequestException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/user.entity';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto'; // 1. Importar el DTO de paginación

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('full-history')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  getFullHistory(@Query() queryDto: DashboardQueryDto) {
    return this.dashboardService.getFullHistory(queryDto);
  }

  @Get('summary')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  getSummaryMetrics(@Query() queryDto: DashboardQueryDto) {
    return this.dashboardService.getSummaryMetrics(queryDto);
  }

  @Get('event-performance')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  getEventPerformance(@Query() queryDto: DashboardQueryDto) {
    return this.dashboardService.getEventPerformance(queryDto);
  }

  @Get('rrpp-performance')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  getRRPPPerformance(@Query() queryDto: DashboardQueryDto) {
    return this.dashboardService.getRRPPPerformance(queryDto);
  }
  
  @Get('my-rrpp-stats')
  @Roles(UserRole.RRPP)
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
  // 2. Usar el DTO de paginación en lugar del DTO del dashboard
  getAttendanceRanking(@Query() paginationQuery: PaginationQueryDto) {
    return this.dashboardService.getAttendanceRanking(paginationQuery);
  }

  @Get('loyalty/perfect-attendance')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  getPerfectAttendance(@Query() query: DashboardQueryDto) {
    const { startDate, endDate } = query;
    if (!startDate || !endDate) {
      throw new BadRequestException('Los parámetros startDate y endDate son requeridos.');
    }
    return this.dashboardService.getPerfectAttendance(startDate, endDate);
  }
}