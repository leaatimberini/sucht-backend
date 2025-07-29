import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // Endpoint para que el frontend guarde su suscripción
  @Post('subscribe')
  subscribe(@Request() req, @Body() subscription: any) {
    const userId = req.user.id;
    this.notificationsService.addSubscription(userId, subscription);
    return { message: 'Suscripción guardada' };
  }
  
  // Endpoint de prueba para enviar una notificación
  @Post('send-test')
  sendTestNotification(@Request() req) {
    const userId = req.user.id;
    const payload = {
      title: '¡Hola desde SUCHT!',
      body: 'Esta es una notificación de prueba.',
      icon: '/icon-192x192.png' // Icono que se mostrará
    };
    this.notificationsService.sendNotification(userId, payload);
    return { message: 'Notificación de prueba enviada' };
  }
}