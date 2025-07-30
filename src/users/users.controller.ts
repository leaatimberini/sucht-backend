import { Controller, Get, Param, Body, UseGuards, Post, NotFoundException, Patch, UseInterceptors, UploadedFile, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from './user.entity';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}
  
  @Get('by-username/:username')
  async findByUsername(@Param('username') username: string) {
    const user = await this.usersService.findOneByUsername(username);
    if (!user) {
      throw new NotFoundException(`User with username "${username}" not found`);
    }
    const { password, ...result } = user;
    return result;
  }

  // --- ENDPOINT AÑADIDO PARA CUMPLEAÑOS ---
  @Get('birthdays')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RRPP)
  async findUpcomingBirthdays() {
    const users = await this.usersService.findUpcomingBirthdays(15); // Próximos 15 días
    return users.map(user => {
      const { password, ...result } = user;
      return result;
    });
  }

  @Patch('profile/me')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('profileImage'))
  async updateProfile(
    @Request() req, 
    @Body() updateProfileDto: UpdateProfileDto, 
    @UploadedFile() profileImage?: Express.Multer.File,
  ) {
    let profileImageUrl: string | undefined = undefined;
    if (profileImage) {
      const uploadResult = await this.cloudinaryService.uploadImage(profileImage, 'sucht/profiles');
      profileImageUrl = uploadResult.secure_url;
    }
    const userId = req.user.id;
    const updatedUser = await this.usersService.updateProfile(userId, updateProfileDto, profileImageUrl);
    const { password, ...result } = updatedUser;
    return result;
  }
  
  @Get('profile/me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@Request() req) { const userId = req.user.id; const user = await this.usersService.findOneById(userId); const { password, ...result } = user; return result; }
  
  @Post('invite-staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async inviteStaff(@Body() inviteStaffDto: InviteStaffDto) { const user = await this.usersService.inviteOrUpdateStaff(inviteStaffDto); const { password, ...result } = user; return result; }

  @Get('by-email/:email')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findByEmail(@Param('email') email: string) { const user = await this.usersService.findOneByEmail(email); if (!user) { throw new NotFoundException(`User with email "${email}" not found`); } const { password, ...result } = user; return result; }
  
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAll() { const users = await this.usersService.findAll(); return users.map(user => { const { password, ...result } = user; return result; }); }
  
  @Get('staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findStaff() { const users = await this.usersService.findStaff(); return users.map(user => { const { password, ...result } = user; return result; }); }
  
  @Get('clients')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findClients() { const users = await this.usersService.findClients(); return users.map(user => { const { password, ...result } = user; return result; }); }
  
  @Patch(':id/roles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateUserRoles(@Param('id') id: string, @Body() updateUserRoleDto: UpdateUserRoleDto,) { const user = await this.usersService.updateUserRoles(id, updateUserRoleDto.roles); const { password, ...result } = user; return result; }
}
