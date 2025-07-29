import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/user.entity';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('subscribe')
  subscribe(@Request() req, @Body() subscription: any) {
    const userId = req.user.id;
    this.notificationsService.addSubscription(userId, subscription);
    return { message: 'Suscripción guardada' };
  }
  
  // --- NUEVO ENDPOINT ---
  @Post('send-to-all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER) // Solo Admins y Dueños pueden enviar
  sendToAll(@Body() payload: { title: string; body: string }) {
    const fullPayload = { ...payload, icon: '/icon-192x192.png' };
    this.notificationsService.sendNotificationToAll(fullPayload);
    return { message: 'Notificación enviada a todos los suscriptores.' };
  }
}