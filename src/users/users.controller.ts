// src/users/users.controller.ts
import {
  Controller,
  Get,
  Param,
  Body,
  UseGuards,
  Post,
  NotFoundException,
  Patch,
  UseInterceptors,
  UploadedFile,
  Request,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
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
import { ChangePasswordDto } from './dto/change-password.dto';
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

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
      const uploadResult = await this.cloudinaryService.uploadImage(
        profileImage,
        'sucht/profiles',
      );
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

  @Patch('profile/change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT) // Devuelve 204 si es exitoso
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(req.user.id, changePasswordDto);
    // No devolvemos nada en el cuerpo de la respuesta
  }

  @Post('invite-staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN) // Solo el ADMIN puede invitar staff
  async inviteStaff(@Body() inviteStaffDto: InviteStaffDto) {
    const user = await this.usersService.inviteOrUpdateStaff(inviteStaffDto);
    const { password, ...result } = user;
    return result;
  }

  @Get('by-email/:email')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN) // Solo el ADMIN puede buscar usuarios por email
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
    return this.usersService.findStaff(paginationQuery);
  }

  @Get('clients')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findClients(@Query() paginationQuery: PaginationQueryDto) {
    return this.usersService.findClients(paginationQuery);
  }

  @Patch(':id/roles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN) // Solo el ADMIN puede actualizar roles
  async updateUserRoles(
    @Param('id') id: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ) {
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
    return users.map((user) => {
      const { password, ...result } = user;
      return result;
    });
  }

  // --- GOOGLE REVIEW ENDPOINTS ---

  @Post('request-google-review-validation')
  @UseGuards(JwtAuthGuard)
  async requestGoogleReviewValidation(@Request() req) {
    return this.usersService.requestGoogleReviewValidation(req.user.id);
  }

  @Get('google-review-status')
  @UseGuards(JwtAuthGuard)
  async getGoogleReviewStatus(@Request() req) {
    return this.usersService.getGoogleReviewStatus(req.user.id);
  }

  // --- ADMIN GOOGLE REVIEW MANAGEMENT ---

  @Get('google-reviews')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getGoogleReviews(@Query('status') status?: any) {
    // Cast string to Enum if present
    // Importante: status viene como string en query param
    return this.usersService.findGoogleReviewRequests(status);
  }

  @Post(':id/approve-google-review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async approveGoogleReviewEndpoint(@Param('id') id: string, @Body('rewardId') rewardId?: string) {
    await this.usersService.approveGoogleReview(id, rewardId);
    return { message: 'Reseña aprobada y premio enviado.' };
  }

  @Post(':id/reject-google-review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async rejectGoogleReviewEndpoint(@Param('id') id: string) {
    await this.usersService.rejectGoogleReview(id);
    return { message: 'Reseña rechazada.' };
  }

  // --- STANDARD USER MANAGEMENT ---
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN) // Solo el ADMIN puede ver todos los usuarios
  async findAll(@Query() paginationQuery: PaginationQueryDto) {
    const { data, ...pagination } = await this.usersService.findAll(paginationQuery);
    const results = data.map((user) => {
      const { password, ...result } = user;
      return result;
    });
    return { results, ...pagination };
  }

  // --- ADMIN USER MANAGEMENT ---

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminUpdateUser(
    @Param('id') id: string,
    @Body() updateData: Partial<any>, // Usamos Partial<any> o un DTO específico si fuera necesario
  ) {
    // Filtramos campos sensibles por seguridad
    const allowedUpdates = {
      name: updateData.name,
      email: updateData.email,
      username: updateData.username,
      dateOfBirth: updateData.dateOfBirth,
    };

    const user = await this.usersService.adminUpdateProfile(id, allowedUpdates);
    const { password, ...result } = user;
    return result;
  }

  @Patch(':id/force-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async adminForcePasswordChange(
    @Param('id') id: string,
    @Body('password') password: string,
  ) {
    if (!password || password.length < 6) {
      throw new NotFoundException('La contraseña debe tener al menos 6 caracteres.');
    }
    await this.usersService.adminForcePasswordChange(id, password);
  }

  @Post(':id/delete') // Usando POST con sufijo o DELETE method
  // NestJS standard is DELETE method
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id') id: string) {
    await this.usersService.deleteUser(id);
  }

  // Also register standard DELETE method
  @Get(':id/delete') // Fallback GET for simple calls if needed, but standard is DELETE
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteUserGet(@Param('id') id: string) {
    await this.usersService.deleteUser(id);
    return { message: 'Usuario eliminado' };
  }

  // Standard REST Delete
  @Patch(':id/delete') // Some proxies block DELETE
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteUserPatch(@Param('id') id: string) {
    await this.usersService.deleteUser(id);
    return { message: 'Usuario eliminado' };
  }

  // REAL DELETE
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(':id/remove')
  async removeUser(@Param('id') id: string) {
    await this.usersService.deleteUser(id);
  }
}
