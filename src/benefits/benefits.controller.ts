import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { BenefitsService } from './benefits.service';
import { CreateBenefitDto } from './dto/create-benefit.dto';
import { UpdateBenefitDto } from './dto/update-benefit.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/user.entity';
import { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface';
import { Public } from 'src/auth/decorators/public.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { unlink } from 'fs/promises';

@Controller('benefits')
export class BenefitsController {
    constructor(
        private readonly benefitsService: BenefitsService,
        private readonly cloudinaryService: CloudinaryService
    ) { }

    // --- Public: List all active benefits ---
    @Public()
    @Get()
    findAll() {
        return this.benefitsService.findAllActive();
    }

    // --- User: Get My Coupons ---
    @Get('my-coupons')
    @UseGuards(JwtAuthGuard)
    getMyCoupons(@Request() req: AuthenticatedRequest) {
        return this.benefitsService.getMyRedemptions(req.user.id);
    }

    // --- User: Request Coupon ---
    @Post(':id/claim')
    @UseGuards(JwtAuthGuard)
    requestCoupon(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
        return this.benefitsService.requestRedemption(id, req.user);
    }

    // --- Partner: List My Benefits ---
    @Get('partner/me')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.PARTNER, UserRole.ADMIN, UserRole.OWNER)
    findMyBenefits(@Request() req: AuthenticatedRequest) {
        return this.benefitsService.findAllByPartner(req.user.id);
    }

    // --- Public: List benefits by partner ---
    @Public()
    @Get('partner/:id')
    findByPartner(@Param('id') id: string) {
        return this.benefitsService.findAllByPartnerId(id);
    }

    // --- Partner: Create Benefit ---
    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.PARTNER, UserRole.ADMIN, UserRole.OWNER)
    @UseInterceptors(FileInterceptor('image'))
    async create(
        @Request() req: AuthenticatedRequest,
        @UploadedFile() image?: Express.Multer.File
    ) {
        const body = req.body;
        const createBenefitDto = new CreateBenefitDto();
        Object.assign(createBenefitDto, body);

        if (image) {
            const uploadResult = await this.cloudinaryService.uploadImage(image, 'sucht/benefits');
            createBenefitDto.imageUrl = uploadResult.secure_url;
            try {
                await unlink(image.path);
            } catch (err) {
                console.error('Error removing temp file:', err);
            }
        }

        return this.benefitsService.create(createBenefitDto, req.user.id);
    }

    // --- Partner: Update Benefit ---
    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.PARTNER, UserRole.ADMIN, UserRole.OWNER)
    @UseInterceptors(FileInterceptor('image'))
    async update(
        @Param('id') id: string,
        @Request() req: AuthenticatedRequest,
        @UploadedFile() image?: Express.Multer.File
    ) {
        const body = req.body;
        const updateBenefitDto = new UpdateBenefitDto();
        Object.assign(updateBenefitDto, body);

        if (image) {
            const uploadResult = await this.cloudinaryService.uploadImage(image, 'sucht/benefits');
            updateBenefitDto.imageUrl = uploadResult.secure_url;
            try {
                await unlink(image.path);
            } catch (err) {
                console.error('Error removing temp file:', err);
            }
        }

        return this.benefitsService.update(id, updateBenefitDto, req.user.id);
    }

    // --- Partner: Delete Benefit ---
    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.PARTNER, UserRole.ADMIN, UserRole.OWNER)
    remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
        return this.benefitsService.remove(id, req.user.id);
    }

    // --- Partner: Validate Coupon (Scan) ---
    @Post('validate/:code')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.PARTNER, UserRole.ADMIN, UserRole.OWNER)
    validateCoupon(@Param('code') code: string, @Request() req: AuthenticatedRequest) {
        return this.benefitsService.validateRedemption(code, req.user.id);
    }
}
