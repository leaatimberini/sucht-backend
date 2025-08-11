import { Controller, Post, UseGuards, Req, Body, BadRequestException } from '@nestjs/common';
import { BirthdayService } from './birthday.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../users/user.entity';
import { SelectBirthdayOptionDto, BirthdayOption } from './dto/select-birthday-option.dto';

@Controller('birthday')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BirthdayController {
  constructor(private readonly birthdayService: BirthdayService) {}

  /**
   * Endpoint principal para que el cliente elija y reclame su beneficio de cumpleaños.
   */
  @Post('select-option')
  @Roles(UserRole.CLIENT)
  async selectBirthdayOption(
    @Req() req: { user: User },
    @Body() selectBirthdayOptionDto: SelectBirthdayOptionDto,
  ) {
    const { choice, guestLimit } = selectBirthdayOptionDto;

    if (choice === BirthdayOption.CLASSIC) {
      // Validamos que para la opción clásica, el número de invitados sea obligatorio.
      if (typeof guestLimit !== 'number') {
        throw new BadRequestException('Se requiere el número de invitados para la opción clásica.');
      }
      return this.birthdayService.claimClassicBenefit(req.user, guestLimit);
    }
    
    if (choice === BirthdayOption.VIP) {
      // Llamamos a la lógica para generar la preferencia de pago de la mesa VIP.
      return this.birthdayService.claimVipBenefit(req.user);
    }
  }
}