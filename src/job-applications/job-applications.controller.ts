import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, BadRequestException, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JobApplicationsService } from './job-applications.service';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';
import { UpdateJobApplicationStatusDto } from './dto/update-job-application-status.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { Public } from 'src/auth/decorators/public.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/user.entity';

@Controller('job-applications')
export class JobApplicationsController {
    constructor(
        private readonly jobApplicationsService: JobApplicationsService,
        private readonly cloudinaryService: CloudinaryService
    ) { }

    @Public()
    @Post()
    @UseInterceptors(FileInterceptor('cv'))
    async create(
        @Body() createJobApplicationDto: CreateJobApplicationDto,
        @UploadedFile() file: Express.Multer.File
    ) {
        if (!file) {
            throw new BadRequestException('El archivo CV es requerido.');
        }

        // Upload CV to Cloudinary
        const uploadResult = await this.cloudinaryService.uploadFile(file, 'sucht/cvs');
        createJobApplicationDto.cvUrl = uploadResult.secure_url;

        return this.jobApplicationsService.create(createJobApplicationDto);
    }

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.OWNER)
    findAll() {
        return this.jobApplicationsService.findAll();
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.OWNER)
    findOne(@Param('id') id: string) {
        return this.jobApplicationsService.findOne(id);
    }

    @Patch(':id/status')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.OWNER)
    updateStatus(@Param('id') id: string, @Body() updateStatusDto: UpdateJobApplicationStatusDto) {
        return this.jobApplicationsService.updateStatus(id, updateStatusDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.OWNER)
    remove(@Param('id') id: string) {
        return this.jobApplicationsService.remove(id);
    }
}
