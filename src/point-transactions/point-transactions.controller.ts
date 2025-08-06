// backend/src/point-transactions/point-transactions.controller.ts

import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { PointTransactionsService } from './point-transactions.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface';

@Controller('point-transactions')
@UseGuards(JwtAuthGuard)
export class PointTransactionsController {
  constructor(private readonly transactionsService: PointTransactionsService) {}

  @Get('my-history')
  getMyHistory(@Request() req: AuthenticatedRequest) {
    return this.transactionsService.getHistoryForUser(req.user.id);
  }
}