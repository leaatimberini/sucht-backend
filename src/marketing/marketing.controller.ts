
import { Controller, Get, Post, Body, Param, Query, Delete, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CreateQuickCampaignDto } from './dto/create-quick-campaign.dto';
import { MarketingService } from './marketing.service';
import { CampaignOptimizerService } from './campaign-optimizer.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('marketing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.PARTNER)
export class MarketingController {
    constructor(
        private readonly marketingService: MarketingService,
        private readonly optimizerService: CampaignOptimizerService
    ) { }

    @Get('accounts')
    async getAccounts() {
        return this.marketingService.findAllAccounts();
    }

    @Post('accounts')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.OWNER)
    async createAccount(@Body() body: any) {
        return this.marketingService.createAccount(body);
    }

    @Delete('accounts/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.OWNER)
    async removeAccount(@Param('id') id: string) {
        return this.marketingService.removeAccount(id);
    }

    @Post('generate-copy')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.ORGANIZER)
    async generateCopy(@Body() body: { description: string, platform: 'IG' | 'FB' }) {
        return this.marketingService.generateCopy(body.description, body.platform);
    }

    @Post('campaigns/quick-create')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.ORGANIZER)
    async quickCreateCampaign(@Body() body: any) {
        console.log('--- DEBUG QUICK CREATE BODY ---', body);
        return this.marketingService.createQuickCampaign(body);
    }

    @Get('campaigns')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.ORGANIZER)
    async getCampaigns() {
        return this.marketingService.findAllCampaigns();
    }

    @Get('campaigns/:id/details')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.ORGANIZER)
    async getCampaignDetails(@Param('id') id: string) {
        return this.marketingService.getCampaignDetails(id);
    }

    @Get('meta/callback')
    async handleMetaCallback(@Query('code') code: string) {
        return this.marketingService.handleMetaCallback(code);
    }

    @Delete('campaigns/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.ORGANIZER)
    async deleteCampaign(@Param('id') id: string) {
        return this.marketingService.deleteCampaign(id);
    }

    @Post('campaigns/:id/toggle')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.ORGANIZER)
    async toggleCampaign(@Param('id') id: string) {
        return this.marketingService.toggleCampaignStatus(id);
    }

    @Post('campaigns/:id/sync')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.ORGANIZER)
    async syncCampaign(@Param('id') id: string) {
        return this.marketingService.syncCampaignStatus(id);
    }

    @Post('adsets/:id/toggle')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.ORGANIZER)
    async toggleAdSet(@Param('id') id: string) {
        return this.marketingService.toggleAdSetStatus(id);
    }

    @Post('ads/:id/toggle')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.ORGANIZER)
    async toggleAd(@Param('id') id: string) {
        return this.marketingService.toggleAdStatus(id);
    }

    @Get('optimization-logs')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.ORGANIZER)
    async getOptimizationLogs() {
        return this.optimizerService.getLogs();
    }

    @Post('campaigns/:id/analyze')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.ORGANIZER)
    async analyzeCampaignManually(@Param('id') id: string) {
        return this.optimizerService.forceAnalyze(id);
    }



    @Post('generate-image')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.ORGANIZER)
    async generateImage(@Body() body: { prompt: string }) {
        return this.marketingService.generateImage(body.prompt);
    }

    // --- Ad Library Endpoints ---

    @Get('ads')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.ORGANIZER)
    async getAdLibrary() {
        // Return all creatives sorted by performance (e.g. ROAS desc)
        // We need to implement findAllCreatives in service or use repo directly.
        // Let's add findAllCreatives to service.
        return this.marketingService.findAllCreatives();
    }

    @Post('ads/sync')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.ORGANIZER)
    async syncAds() {
        await this.marketingService.syncAdInsights();
        return { message: 'Ad insights sync started.' };
    }

    @Post('videos/upload')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.ORGANIZER)
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads/videos',
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                cb(null, file.fieldname + '-' + uniqueSuffix + extname(file.originalname));
            }
        })
    }))
    async uploadVideo(
        @UploadedFile() file: Express.Multer.File,
        @Body() body: { uploadToken: string, campaignId: string }
    ) {
        if (!file) throw new BadRequestException('File is required');
        // Trigger Ad Creation with the video
        return this.marketingService.processReelAdCreation(file, body.uploadToken, body.campaignId);
    }
}
