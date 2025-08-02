// backend/src/payments/payments.controller.ts

import { Controller, Post, Body, UseGuards, Request, Get, Res, Query, HttpStatus, HttpException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AcquireTicketDto } from 'src/tickets/dto/acquire-ticket.dto';
import { User, UserRole } from 'src/users/user.entity';
import { Response } from 'express';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-preference')
  // Solo los clientes y RRPP pueden crear una preferencia de pago
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.RRPP)
  async createPreference(
    @Request() req: { user: User },
    @Body() body: AcquireTicketDto & { promoterUsername?: string },
  ) {
    const buyer = req.user;
    return this.paymentsService.createPreference(buyer, body);
  }

  // ============== NUEVOS ENDPOINTS PARA OAUTH ================
  @Get('connect/mercadopago')
  // Solo los usuarios con roles de pago (Owner, Admin, RRPP) pueden vincular su cuenta
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RRPP)
  async getAuthUrl(@Request() req: { user: User }, @Res() res: Response) {
    const userId = req.user.id;
    const authUrl = await this.paymentsService.getMercadoPagoAuthUrl(userId);
    return res.redirect(authUrl);
  }

  @Get('mercadopago/callback')
  // Este endpoint se llama después de la autorización de MP, y recibe el código
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RRPP)
  async handleMercadoPagoCallback(@Request() req: { user: User }, @Query('code') code: string, @Res() res: Response) {
    const userId = req.user.id;
    if (!code) {
      // Redirigimos a una página de error en caso de que no haya código de autorización
      return res.redirect(`${process.env.FRONTEND_URL}/rrpp/settings?error=auth_failed`);
    }
    
    try {
      await this.paymentsService.exchangeCodeForAccessToken(userId, code);
      return res.redirect(`${process.env.FRONTEND_URL}/rrpp/settings?success=true`);
    } catch (error) {
      console.error('Error in Mercado Pago callback:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/rrpp/settings?error=server_error`);
    }
  }

  // ================ WEBHOOK DE PAGO ================
  @Post('webhook')
  async handleWebhook(@Body() body: any, @Query('source_news') source: string) {
    // Verificamos que la llamada provenga del webhook de Mercado Pago
    if (source !== 'webhooks') {
      throw new HttpException('Invalid webhook source', HttpStatus.FORBIDDEN);
    }
    // Verificamos si es una notificación de pago
    if (body.type === 'payment') {
      await this.paymentsService.handleWebhook(body.data.id);
    }
    return { status: 'ok' };
  }
}