// src/payments/payments.controller.ts

import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Query,
  HttpStatus,
  HttpCode,
  Delete,
  Redirect,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AcquireTicketDto } from 'src/tickets/dto/acquire-ticket.dto';
import { UserRole } from 'src/users/user.entity';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Public } from 'src/auth/decorators/public.decorator';
import { FinalizePurchaseDto } from './dto/finalize-purchase.dto';
import { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface';
import { UsersService } from 'src/users/users.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    // Se necesita UsersService para desvincular la cuenta
    private readonly usersService: UsersService,
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
    return this.paymentsService.finalizePurchase(
      finalizePurchaseDto.paymentId,
      req.user,
    );
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() body: any,
    @Query('data.id') paymentIdFromQuery: string,
  ) {
    const paymentId = body?.data?.id || paymentIdFromQuery;

    if (body.type === 'payment' && paymentId) {
      this.paymentsService.handleWebhook({ id: paymentId });
    }

    return { status: 'received' };
  }

  // --- ENDPOINTS DE GESTIÓN DE CUENTA (SOLO ADMIN) ---

  @Get('connect/mercadopago')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN) // ✅ CORREGIDO: Acceso exclusivo para Admin
  async getAuthUrl(@Request() req: AuthenticatedRequest) {
    const authUrl = this.paymentsService.getMercadoPagoAuthUrl(req.user.id);
    return { authUrl };
  }

  @Delete('connect/mercadopago')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN) // ✅ CORREGIDO: Acceso exclusivo para Admin
  @HttpCode(HttpStatus.OK)
  async unlinkMercadoPago(@Request() req: AuthenticatedRequest) {
    await this.usersService.updateMercadoPagoCredentials(
      req.user.id,
      null,
      null,
    );
    return { message: 'Cuenta de Mercado Pago desvinculada exitosamente.' };
  }

  @Get('mercadopago/callback')
  @Public()
  @Redirect('/dashboard/settings', 302)
  async handleMercadoPagoCallback(
    @Query('code') code: string,
    @Query('state') state: string,
  ) {
    try {
      await this.paymentsService.exchangeCodeForAccessToken(state, code);
      return { url: '/dashboard/settings?success=true' };
    } catch (error) {
      return { url: '/dashboard/settings?error=true' };
    }
  }
}