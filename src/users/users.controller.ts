import { Controller, Get, Param, Patch, Body, UseGuards, Post, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from './user.entity';
import { InviteStaffDto } from './dto/invite-staff.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('invite-staff')
  async inviteStaff(@Body() inviteStaffDto: InviteStaffDto) {
    const user = await this.usersService.inviteOrUpdateStaff(inviteStaffDto);
    const { password, ...result } = user;
    return result;
  }

  @Get('by-email/:email')
  async findByEmail(@Param('email') email: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new NotFoundException(`User with email "${email}" not found`);
    }
    const { password, ...result } = user;
    return result;
  }

  @Get()
  async findAll() {
    const users = await this.usersService.findAll();
    return users.map(user => {
      const { password, ...result } = user;
      return result;
    });
  }

  @Get('staff')
  async findStaff() {
    const users = await this.usersService.findStaff();
    return users.map(user => {
      const { password, ...result } = user;
      return result;
    });
  }

  @Get('clients')
  async findClients() {
    const users = await this.usersService.findClients();
    return users.map(user => {
      const { password, ...result } = user;
      return result;
    });
  }
}
