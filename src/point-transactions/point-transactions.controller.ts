// backend/src/point-transactions/point-transactions.controller.ts

import { Controller, Get, UseGuards, Request, Post, Body } from '@nestjs/common';
import { PointTransactionsService } from './point-transactions.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface';
import { User } from 'src/users/user.entity';
import { SocialShareDto } from './dto/social-share.dto';

@Controller('point-transactions')
@UseGuards(JwtAuthGuard)
export class PointTransactionsController {
  constructor(private readonly transactionsService: PointTransactionsService) {}

  @Get('my-history')
  getMyHistory(@Request() req: AuthenticatedRequest) {
    return this.transactionsService.getHistoryForUser(req.user.id);
  }

  // --- NUEVO ENDPOINT PARA RECOMPENSAR POR COMPARTIR ---
  @Post('social-share')
  socialShare(
    @Request() req: AuthenticatedRequest,
    @Body() socialShareDto: SocialShareDto
  ) {
    return this.transactionsService.awardPointsForSocialShare(
      req.user as User,
      socialShareDto.eventId
    );
  }
}