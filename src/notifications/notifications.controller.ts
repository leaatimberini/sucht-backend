import { Controller, Post, Body, UseGuards, Request, Get, Patch } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { User, UserRole } from 'src/users/user.entity';
import { IsArray, IsUUID } from 'class-validator';

// DTO para validar el cuerpo de la petición de marcar como leído
class MarkAsReadDto {
  @IsArray()
  @IsUUID('4', { each: true })
  notificationIds: string[];
}


@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('subscribe')
  subscribe(@Request() req: { user: User }, @Body() subscription: any) {
    const userId = req.user.id;
    // El servicio espera el objeto User completo, no solo el ID
    return this.notificationsService.addSubscription(req.user, subscription);
  }
  
  @Post('send-to-all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  sendToAll(@Body() payload: { title: string; body: string }) {
    const fullPayload = { ...payload, icon: '/icon-192x192.png' };
    this.notificationsService.sendNotificationToAll(fullPayload);
    return { message: 'Notificación enviada a todos los suscriptores.' };
  }

  // --- NUEVOS ENDPOINTS PARA EL HEADER ---

  /**
   * Obtiene las notificaciones del usuario logueado.
   */
  @Get('my-notifications')
  findMyNotifications(@Request() req: { user: User }) {
    return this.notificationsService.findMyNotifications(req.user.id);
  }
  
  /**
   * Marca un conjunto de notificaciones como leídas.
   */
  @Patch('mark-as-read')
  markAsRead(@Request() req: { user: User }, @Body() body: MarkAsReadDto) {
    return this.notificationsService.markAsRead(req.user.id, body.notificationIds);
  }
}