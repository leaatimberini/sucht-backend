// backend/src/rewards/rewards.controller.ts

import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/user.entity';
import { Public } from 'src/auth/decorators/public.decorator';
import { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface';
import { User } from 'src/users/user.entity';

@Controller('rewards')
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  create(@Body() createRewardDto: CreateRewardDto) {
    return this.rewardsService.create(createRewardDto);
  }

  @Public()
  @Get()
  findAll() {
    return this.rewardsService.findAll();
  }
  
  // ===== CORRECCIÓN: Se añade el endpoint 'my-rewards' ANTES de ':id' =====
  @Get('my-rewards')
  @UseGuards(JwtAuthGuard)
  getMyRewards(@Request() req: AuthenticatedRequest) {
    return this.rewardsService.findUserRewards(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  findOne(@Param('id') id: string) {
    return this.rewardsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  update(@Param('id') id: string, @Body() updateRewardDto: UpdateRewardDto) {
    return this.rewardsService.update(id, updateRewardDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.rewardsService.remove(id);
  }

  @Post(':id/redeem')
  @UseGuards(JwtAuthGuard)
  redeemReward(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.rewardsService.redeem(id, req.user as User);
  }
}