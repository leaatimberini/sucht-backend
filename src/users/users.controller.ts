// backend/src/users/users.controller.ts
import { Controller, Get, Param, Body, UseGuards, Post, NotFoundException, Patch, UseInterceptors, UploadedFile, Request, HttpCode, HttpStatus, ConflictException, Query } from '@nestjs/common';
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
import { unlink } from 'fs/promises';
import { Public } from 'src/auth/decorators/public.decorator';
import { CompleteInvitationDto } from './dto/complete-invitation.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Public()
  @Post('complete-invitation')
  async completeInvitation(@Body() completeInvitationDto: CompleteInvitationDto) {
    const user = await this.usersService.completeInvitation(completeInvitationDto);
    const { password, ...result } = user;
    return result;
  }

  @Get('profile/me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@Request() req) {
    return this.usersService.getProfile(req.user.id);
  }

  @Patch('profile/me')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('profileImage'))
  async updateMyProfile(
    @Request() req,
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFile() profileImage?: Express.Multer.File,
  ) {
    const userId = req.user.id;
    if (profileImage) {
      const uploadResult = await this.cloudinaryService.uploadImage(profileImage, 'sucht/profiles');
      updateProfileDto.profileImageUrl = uploadResult.secure_url;
      try {
        await unlink(profileImage.path);
      } catch (err) {
        console.error('Error removing temporary file:', err);
      }
    }
    const updatedUser = await this.usersService.updateProfile(userId, updateProfileDto);
    const { password, invitationToken, ...result } = updatedUser;
    return result;
  }
  
  @Post('invite-staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN) // ✅ Corregido: Solo el ADMIN puede invitar staff.
  async inviteStaff(@Body() inviteStaffDto: InviteStaffDto) {
    const user = await this.usersService.inviteOrUpdateStaff(inviteStaffDto);
    const { password, ...result } = user;
    return result;
  }
  
  @Get('by-email/:email')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN) // ✅ Corregido: Solo el ADMIN puede buscar usuarios por email.
  async findByEmail(@Param('email') email: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new NotFoundException(`User with email "${email}" not found`);
    }
    const { password, ...result } = user;
    return result;
  }

  @Get('staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findStaff(@Query() paginationQuery: PaginationQueryDto) {
  // ✅ CORRECCIÓN: Devolver directamente el objeto paginado
  return this.usersService.findStaff(paginationQuery);
  }

  @Get('clients')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findClients(@Query() paginationQuery: PaginationQueryDto) {
  // ✅ CORRECCIÓN: Devolver directamente el objeto paginado
  return this.usersService.findClients(paginationQuery);
  }

  @Patch(':id/roles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN) // ✅ Corregido: Solo el ADMIN puede actualizar roles para mantener el control total.
  async updateUserRoles(@Param('id') id: string, @Body() updateUserRoleDto: UpdateUserRoleDto,) {
    const user = await this.usersService.updateUserRoles(id, updateUserRoleDto.roles);
    const { password, ...result } = user;
    return result;
  }

  @Get('by-username/:username')
  @UseGuards(JwtAuthGuard, RolesGuard) 
  @Roles(UserRole.ADMIN, UserRole.RRPP, UserRole.CLIENT)
  async findByUsername(@Param('username') username: string) {
    const user = await this.usersService.findOneByUsername(username);
    if (!user) {
      throw new NotFoundException(`User with username "${username}" not found`);
    }
    const { password, ...result } = user;
    return result;
  }

  @Get('birthdays')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RRPP)
  async findUpcomingBirthdays() {
    const users = await this.usersService.findUpcomingBirthdays(15);
    return users.map(user => {
      const { password, ...result } = user;
      return result;
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN) // ✅ Corregido: Solo el ADMIN puede ver todos los usuarios.
  async findAll(@Query() paginationQuery: PaginationQueryDto) {
    const { data, ...pagination } = await this.usersService.findAll(paginationQuery);
    const results = data.map(user => {
      const { password, ...result } = user;
      return result;
    });
    return { results, ...pagination };
  }
}