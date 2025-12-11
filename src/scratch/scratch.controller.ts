import { Controller, Get, Post, Body, UseGuards, Req, ForbiddenException, Param } from '@nestjs/common';
import { ScratchService } from './scratch.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('scratch')
export class ScratchController {
    constructor(private readonly scratchService: ScratchService) { }

    @UseGuards(JwtAuthGuard)
    @Get('status')
    async getStatus(@Req() req) {
        return this.scratchService.getUserStatus(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Post('play')
    async play(@Req() req) {
        return this.scratchService.play(req.user.id);
    }

    // Admin Config Endpoints
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.PARTNER)
    @Get('prizes')
    async getPrizes(@Req() req) {
        // Partners only see their own prizes? Logic to follow.
        return this.scratchService.getPrizes(req.user);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.PARTNER)
    @Post('prizes')
    async createPrize(@Body() body: any) {
        return this.scratchService.createPrize(body);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.PARTNER)
    @Post('prizes/:id')
    async updatePrize(@Param('id') id: string, @Body() body: any) {
        return this.scratchService.updatePrize(id, body);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Post('prizes/:id/delete')
    async deletePrize(@Param('id') id: string) {
        return this.scratchService.deletePrize(id);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.PARTNER)
    @Get('partner/history')
    async getPartnerHistory(@Req() req) {
        return this.scratchService.getPartnerHistory(req.user.id);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Get('history')
    async getHistory() {
        return this.scratchService.getAllHistory();
    }



    // Redeem Endpoint (For Partners/Staff)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.PARTNER, UserRole.RRPP)
    @Post('redeem/:id')
    async redeem(@Param('id') id: string, @Req() req) {
        return this.scratchService.redeem(id, req.user.id);
    }
}
