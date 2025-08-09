// backend/src/scan/scan.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ScanService } from './scan.service';
import { ScanDataDto } from './scan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('scan')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  @Post('redeem')
  @Roles(UserRole.VERIFIER, UserRole.BARRA, UserRole.ADMIN, UserRole.OWNER)
  redeem(@Body() scanDataDto: ScanDataDto) {
    return this.scanService.processScan(scanDataDto.qrData, scanDataDto.guestsEntered);
  }
}