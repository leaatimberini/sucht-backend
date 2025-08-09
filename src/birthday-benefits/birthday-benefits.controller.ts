// backend/src/birthday-benefits/birthday-benefits.controller.ts

import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { BirthdayBenefitsService } from './birthday-benefits.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface';
import { User } from 'src/users/user.entity';
import { CreateBirthdayBenefitDto } from './dto/create-birthday-benefit.dto';

@Controller('birthday-benefits')
@UseGuards(JwtAuthGuard) // Todos los endpoints de este módulo requieren que el usuario esté logueado
export class BirthdayBenefitsController {
  constructor(private readonly birthdayBenefitsService: BirthdayBenefitsService) {}

  @Post('claim-group-entry')
  claimGroupEntry(
    @Request() req: AuthenticatedRequest,
    @Body() createBirthdayBenefitDto: CreateBirthdayBenefitDto
  ) {
    return this.birthdayBenefitsService.createGroupEntryBenefit(req.user as User, createBirthdayBenefitDto);
  }

  @Post('claim-champagne-gift')
  claimChampagneGift(@Request() req: AuthenticatedRequest) {
    return this.birthdayBenefitsService.createChampagneGiftBenefit(req.user as User);
  }
}