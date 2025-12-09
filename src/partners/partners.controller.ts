import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { PartnersService } from './partners.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/user.entity';
import { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface';
import { Public } from 'src/auth/decorators/public.decorator';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { unlink } from 'fs/promises';

@Controller('partners')
export class PartnersController {
    constructor(
        private readonly partnersService: PartnersService,
        private readonly cloudinaryService: CloudinaryService
    ) { }

    // --- Public: List all partners ---
    @Public()
    @Get()
    findAll() {
        return this.partnersService.findAll();
    }

    // --- Public: Get Partner Profile ---
    @Public()
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.partnersService.findOne(id);
    }

    // --- Partner: Get My Profile ---
    @Get('profile/me')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.PARTNER, UserRole.ADMIN, UserRole.OWNER)
    async getMyProfile(@Request() req: AuthenticatedRequest) {
        return this.partnersService.findOneByUserId(req.user.id);
    }

    // --- Admin/Partner: Create Profile ---
    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.PARTNER, UserRole.ADMIN, UserRole.OWNER)
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'logo', maxCount: 1 },
        { name: 'cover', maxCount: 1 },
    ]))
    async create(
        @Request() req: AuthenticatedRequest,
        @UploadedFiles() files: { logo?: Express.Multer.File[], cover?: Express.Multer.File[] }
    ) {
        const body = req.body;
        const createPartnerDto = new CreatePartnerDto();
        Object.assign(createPartnerDto, body);

        // Handle Logo
        if (files?.logo?.[0]) {
            const uploadResult = await this.cloudinaryService.uploadImage(files.logo[0], 'sucht/partners');
            createPartnerDto.logoUrl = uploadResult.secure_url;
            try { await unlink(files.logo[0].path); } catch (e) { console.error(e); }
        }

        // Handle Cover
        if (files?.cover?.[0]) {
            const uploadResult = await this.cloudinaryService.uploadImage(files.cover[0], 'sucht/partners/covers');
            createPartnerDto.coverUrl = uploadResult.secure_url;
            try { await unlink(files.cover[0].path); } catch (e) { console.error(e); }
        }

        return this.partnersService.create(createPartnerDto, req.user);
    }

    // --- Partner/Admin: Edit Profile ---
    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.PARTNER, UserRole.ADMIN, UserRole.OWNER)
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'logo', maxCount: 1 },
        { name: 'cover', maxCount: 1 },
    ]))
    async update(
        @Param('id') id: string,
        @Request() req: AuthenticatedRequest,
        @UploadedFiles() files: { logo?: Express.Multer.File[], cover?: Express.Multer.File[] }
    ) {
        const body = req.body;
        const updatePartnerDto = new UpdatePartnerDto();
        Object.assign(updatePartnerDto, body);

        // Handle Logo
        if (files?.logo?.[0]) {
            const uploadResult = await this.cloudinaryService.uploadImage(files.logo[0], 'sucht/partners');
            updatePartnerDto.logoUrl = uploadResult.secure_url;
            try { await unlink(files.logo[0].path); } catch (e) { console.error(e); }
        }

        // Handle Cover
        if (files?.cover?.[0]) {
            const uploadResult = await this.cloudinaryService.uploadImage(files.cover[0], 'sucht/partners/covers');
            updatePartnerDto.coverUrl = uploadResult.secure_url;
            try { await unlink(files.cover[0].path); } catch (e) { console.error(e); }
        }

        return this.partnersService.update(id, updatePartnerDto);
    }

    // --- Admin: Delete ---
    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.OWNER)
    remove(@Param('id') id: string) {
        return this.partnersService.remove(id);
    }

    // --- Admin: List All Partners (With Stats) ---
    @Get('admin/all')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.OWNER)
    findAllAdmin() {
        return this.partnersService.getAllPartnersWithStats();
    }

    // --- Partner/Admin: Get Analytics ---
    @Get(':id/stats')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.PARTNER, UserRole.ADMIN, UserRole.OWNER)
    async getStats(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
        // Security check: ensure partner is accessing their own stats
        // (Unless admin)
        if (req.user.roles.includes(UserRole.PARTNER) && !req.user.roles.includes(UserRole.ADMIN)) {
            const myPartner = await this.partnersService.findOneByUserId(req.user.id);
            if (!myPartner || myPartner.id !== id) {
                throw new Error('Unauthorized access to stats'); // 403 Forbidden effectively
            }
        }
        return this.partnersService.getStats(id);
    }

    // --- User: Apply for Partner ---
    @Post('apply')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'logo', maxCount: 1 },
        { name: 'cover', maxCount: 1 },
    ]))
    async apply(
        @Request() req: AuthenticatedRequest,
        @UploadedFiles() files: { logo?: Express.Multer.File[], cover?: Express.Multer.File[] }
    ) {
        // Reuse logic from create, but maybe ensure distinct flow?
        // Actually, create method in service now defaults to PENDING, so this works.
        // We just need to make sure regular "create" (by Admin) maybe sets it to APPROVED?
        // But for now, let's treat 'apply' as the user-facing create.
        // Admins creating partners likely use the same flow or we need a param override.
        // For MVP, admins can create (PENDING) then Approve immediately or we update service. 
        // Let's keep it simple: ALL creations are PENDING unless updated.
        const body = req.body;
        const createPartnerDto = new CreatePartnerDto();
        Object.assign(createPartnerDto, body);

        if (files?.logo?.[0]) {
            const uploadResult = await this.cloudinaryService.uploadImage(files.logo[0], 'sucht/partners');
            createPartnerDto.logoUrl = uploadResult.secure_url;
            try { await unlink(files.logo[0].path); } catch (e) { console.error(e); }
        }

        if (files?.cover?.[0]) {
            const uploadResult = await this.cloudinaryService.uploadImage(files.cover[0], 'sucht/partners/covers');
            createPartnerDto.coverUrl = uploadResult.secure_url;
            try { await unlink(files.cover[0].path); } catch (e) { console.error(e); }
        }

        return this.partnersService.create(createPartnerDto, req.user);
    }

    // --- Admin: Approve Partner ---
    @Patch(':id/approve')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.OWNER)
    approve(@Param('id') id: string) {
        return this.partnersService.approve(id);
    }

    // --- Admin: Reject Partner ---
    @Patch(':id/reject')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.OWNER)
    reject(@Param('id') id: string) {
        return this.partnersService.reject(id);
    }

    // --- Public: Track View ---
    @Post(':id/view')
    @Public()
    async trackView(@Param('id') id: string, @Request() req: any) {
        const userId = req.user?.id || null;
        return this.partnersService.trackView(id, userId);
    }
}
