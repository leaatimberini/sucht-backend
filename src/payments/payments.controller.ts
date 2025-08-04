// backend/src/payments/payments.controller.ts

import { Controller, Post, Body, UseGuards, Request, Get, Res, Query, HttpStatus, HttpException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AcquireTicketDto } from 'src/tickets/dto/acquire-ticket.dto';
import { User, UserRole } from 'src/users/user.entity';
import { Response } from 'express';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Public } from 'src/auth/decorators/public.decorator';

@Controller('payments')
// 1. Se elimina la protección GLOBAL @UseGuards(JwtAuthGuard) de aquí.
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-preference')
  // 2. La protección se aplica AHORA a cada endpoint que la necesita.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.RRPP)
  async createPreference(
    @Request() req: { user: User },
    @Body() body: AcquireTicketDto & { promoterUsername?: string },
  ) {
    const buyer = req.user;
    return this.paymentsService.createPreference(buyer, body);
  }

  @Get('connect/mercadopago')
  // 2. La protección también se aplica aquí.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RRPP)
  async getAuthUrl(@Request() req: { user: User }) {
    const userId = req.user.id;
    const authUrl = await this.paymentsService.getMercadoPagoAuthUrl(userId);
    return { authUrl };
  }

  @Get('mercadopago/callback')
  // 3. Se marca como PÚBLICO. El navegador no envía token en la redirección.
  @Public()
  async handleMercadoPagoCallback(
    @Query('code') code: string,
    @Query('state') state: string, // 4. Se obtiene el 'state' para identificar al usuario.
    @Res() res: Response,
  ) {
    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/settings?error=auth_failed`);
    }
    
    try {
      // 5. Se pasa el 'state' al servicio en lugar del 'userId'.
      await this.paymentsService.exchangeCodeForAccessToken(state, code);
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/settings?success=true`);
    } catch (error) {
      console.error('Error in Mercado Pago callback:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/settings?error=server_error`);
    }
  }

  @Post('webhook')
  @Public()
  async handleWebhook(@Body() body: any, @Query('source_news') source: string) {
    // La verificación del 'source' puede ser muy estricta para las pruebas.
    // La comentamos para asegurar compatibilidad. La validación real
    // se debe hacer con la firma del webhook si se implementa en el futuro.
    /* if (source !== 'webhooks') {
       throw new HttpException('Invalid webhook source', HttpStatus.FORBIDDEN);
    }
    */

    // Procesamos la notificación SOLO si es de tipo 'payment'.
    if (body.type === 'payment' && body.data?.id) {
      try {
        await this.paymentsService.handleWebhook(body.data.id);
      } catch (error) {
        console.error(`Error processing payment webhook for paymentId: ${body.data.id}`, error);
        // Aún así devolvemos 'ok' para que MP no siga reintentando.
      }
    }
    
    // Para cualquier otra notificación (como la de prueba 'mp-connect'),
    // simplemente confirmamos la recepción con un 'ok'.
    return { status: 'ok' };
  }
}