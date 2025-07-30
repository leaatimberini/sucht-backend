import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AcquireTicketDto } from 'src/tickets/dto/acquire-ticket.dto';
import { User } from 'src/users/user.entity'; // <-- RUTA CORREGIDA

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-preference')
  createPreference(
    @Request() req: { user: User },
    @Body() body: AcquireTicketDto & { promoterUsername?: string },
  ) {
    const buyer = req.user;
    return this.paymentsService.createPreference(buyer, body);
  }
}
