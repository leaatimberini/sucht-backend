// src/payments/payments.controller.ts

import { Controller, Post, Body, UseGuards, Request, Get, Query, HttpStatus, HttpCode } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AcquireTicketDto } from 'src/tickets/dto/acquire-ticket.dto';
import { UserRole } from 'src/users/user.entity';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Public } from 'src/auth/decorators/public.decorator';
import { FinalizePurchaseDto } from './dto/finalize-purchase.dto';
import { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
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
  
  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any, @Query('data.id') paymentIdFromQuery: string) {
    // Mercado Pago a veces envía el ID en el query param para compatibilidad
    const paymentId = body?.data?.id || paymentIdFromQuery;

    if (body.type === 'payment' && paymentId) {
        // No esperamos la promesa para responder a MP rápidamente
        this.paymentsService.handleWebhook({ id: paymentId });
    }
    
    // Respondemos inmediatamente a Mercado Pago para evitar timeouts
    return { status: 'received' };
  }
}