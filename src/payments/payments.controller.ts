// backend/src/payments/payments.controller.ts
import { Controller, Post, Body, UseGuards, Request, Get, Res, Query, HttpStatus, HttpException, HttpCode, Delete, Redirect } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AcquireTicketDto } from 'src/tickets/dto/acquire-ticket.dto';
import { User, UserRole } from 'src/users/user.entity';
import { Response } from 'express';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Public } from 'src/auth/decorators/public.decorator';
import { FinalizePurchaseDto } from './dto/finalize-purchase.dto';
import { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface';
import { UsersService } from 'src/users/users.service';
import { TaloService } from './talo.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly usersService: UsersService,
    private readonly taloService: TaloService,
  ) {}

  @Post('create-preference')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.RRPP, UserRole.ADMIN, UserRole.OWNER)
  async createPreference(
    @Request() req: AuthenticatedRequest,
    @Body() body: AcquireTicketDto & { promoterUsername?: string },
  ) {
    const buyer = req.user;
    return this.paymentsService.createPreference(buyer, body);
  }

  @Post('finalize-purchase')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async finalizePurchase(
    @Request() req: AuthenticatedRequest,
    @Body() finalizePurchaseDto: FinalizePurchaseDto,
  ) {
    return this.paymentsService.finalizePurchase(finalizePurchaseDto.paymentId, req.user);
  }
  
  @Get('connect/mercadopago')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RRPP)
  async getAuthUrl(@Request() req: AuthenticatedRequest) {
    const authUrl = this.paymentsService.getMercadoPagoAuthUrl(req.user.id);
    return { authUrl };
  }

  // ==========================================================
  // ===== NUEVO ENDPOINT PARA DESVINCULAR MERCADO PAGO =====
  // ==========================================================
  @Delete('connect/mercadopago')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async unlinkMercadoPago(@Request() req: AuthenticatedRequest) {
    // Usamos el servicio de usuarios para limpiar las credenciales de MP del usuario logueado
    await this.usersService.updateMercadoPagoCredentials(req.user.id, null, null);
    return { message: 'Cuenta de Mercado Pago desvinculada exitosamente.' };
  }

  @Get('mercadopago/callback')
  @Public()
  @Redirect('/dashboard/settings', 302)
  async handleMercadoPagoCallback(@Query('code') code: string, @Query('state') state: string) {
    try {
      await this.paymentsService.exchangeCodeForAccessToken(state, code);
      return { url: '/dashboard/settings?success=true' };
    } catch (error) {
      return { url: '/dashboard/settings?error=true' };
    }
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any, @Query('data.id') paymentIdFromQuery: string) {
    const paymentId = body?.data?.id || paymentIdFromQuery;

    if (body.type === 'payment' && paymentId) {
      try {
        await this.paymentsService.handleWebhook(paymentId);
      } catch (error) {
        console.error(`Error procesando webhook para paymentId: ${paymentId}`, error);
      }
    }
    
    return { status: 'received' };
  }

  /**
   * NUEVO ENDPOINT: Devuelve la URL para vincular Talo.
   */
  @Get('connect/talo')
  @UseGuards(JwtAuthGuard)
  getTaloAuthUrl(@Request() req) {
    return this.taloService.getTaloAuthUrl(req.user.id);
  }
  @Public()
  @Get('callback/talo')
  @Redirect('/dashboard/settings', 302)
  async handleTaloCallback(@Query('code') code: string, @Query('state') state: string) {
    try {
      const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('ascii'));
      const userId = decodedState.userId;
      if (!userId) throw new Error('User ID no encontrado en el state');

      const tokens = await this.taloService.exchangeCodeForTokens(code);
      
      await this.usersService.updateTaloCredentials(
          userId, 
          tokens.access_token, 
          tokens.refresh_token, 
          tokens.user_id
      );
      
      return { url: '/dashboard/settings?success_talo=true' };
    } catch (error) {
      console.error("Error en el callback de Talo:", error);
      return { url: '/dashboard/settings?error_talo=true' };
    }
  }
}