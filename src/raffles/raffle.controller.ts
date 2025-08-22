import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards, Body } from '@nestjs/common';
import { RaffleService } from './raffle.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { Public } from '../auth/decorators/public.decorator';
import { ConfigureRaffleDto } from './dto/configure-raffle.dto';

@Controller('raffles')
export class RaffleController {
  constructor(private readonly raffleService: RaffleService) {}

  @Post('configure/:eventId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  configureRaffle(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() configureRaffleDto: ConfigureRaffleDto,
  ) {
    return this.raffleService.createOrUpdateRaffle(eventId, configureRaffleDto);
  }

  @Public()
  @Get('event/:eventId')
  getRaffleForEvent(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.raffleService.getRaffleForEvent(eventId);
  }
}