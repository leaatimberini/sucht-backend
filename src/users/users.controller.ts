import { Controller, Get, Param, Patch, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from './user.entity';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Este endpoint ahora devuelve TODOS los usuarios
  @Get()
  async findAll() {
    const users = await this.usersService.findAll();
    return users.map(user => {
      const { password, ...result } = user;
      return result;
    });
  }

  // --- NUEVOS ENDPOINTS ---

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

  @Patch(':id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ) {
    const user = await this.usersService.updateUserRole(id, updateUserRoleDto.role);
    const { password, ...result } = user;
    return result;
  }
}