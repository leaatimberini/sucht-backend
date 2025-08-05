// backend/src/payments/payments.controller.ts
import { Controller, Post, Body, UseGuards, Request, Get, Res, Query, HttpStatus, HttpException, HttpCode } from '@nestjs/common';
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

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-preference')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.RRPP, UserRole.ADMIN, UserRole.OWNER) // Permitir a todos los logueados crear preferencias
  async createPreference(
    @Request() req: AuthenticatedRequest,
    @Body() body: AcquireTicketDto & { promoterUsername?: string },
  ) {
    const buyer = req.user;
    return this.paymentsService.createPreference(buyer, body);
  }

  // ==========================================================
  // NUEVO ENDPOINT PARA VERIFICACIÓN SÍNCRONA DESDE EL FRONTEND
  // ==========================================================
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RRPP)
  async getAuthUrl(@Request() req: AuthenticatedRequest) {
    const userId = req.user.id;
    const authUrl = this.paymentsService.getMercadoPagoAuthUrl(userId);
    return { authUrl };
  }

  @Get('mercadopago/callback')
  @Public()
  async handleMercadoPagoCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/settings?error=auth_failed`);
    }
    
    try {
      await this.paymentsService.exchangeCodeForAccessToken(state, code);
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/settings?success=true`);
    } catch (error) {
      console.error('Error in Mercado Pago callback:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/settings?error=server_error`);
    }
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK) // Siempre responder 200 OK a los webhooks
  async handleWebhook(@Body() body: any, @Query('data.id') paymentIdFromQuery: string) {
    const paymentId = body?.data?.id || paymentIdFromQuery;

    if (body.type === 'payment' && paymentId) {
      try {
        // La lógica compleja ahora está en el servicio
        await this.paymentsService.handleWebhook(paymentId);
      } catch (error) {
        // Aunque falle nuestro procesamiento, respondemos OK a MP para que no reintente indefinidamente.
        // Nuestro logger ya registró el error para que lo solucionemos.
        console.error(`Error procesando webhook para paymentId: ${paymentId}`, error);
      }
    }
    
    return { status: 'received' };
  }
}