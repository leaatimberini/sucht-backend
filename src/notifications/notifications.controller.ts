// src/notifications/notifications.controller.ts
import { Controller, Post, Body, UseGuards, Request, Get, Patch, Delete, Param, ParseUUIDPipe } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { User, UserRole } from 'src/users/user.entity';
import { IsArray, IsUUID } from 'class-validator';
import { UnsubscribeDto } from './dto/unsubscribe.dto';
import { FeedbackDto } from './dto/feedback.dto';

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
    return this.notificationsService.addSubscription(req.user, subscription);
  }

  @Post('unsubscribe')
  unsubscribe(@Request() req: { user: User }, @Body() unsubscribeDto: UnsubscribeDto) {
    return this.notificationsService.removeSubscription(unsubscribeDto.endpoint, req.user.id);
  }
  
  @Post('send-to-all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  sendToAll(@Body() payload: { title: string; body: string }) {
    const fullPayload = { ...payload, icon: '/icon-192x192.png' };
    this.notificationsService.sendNotificationToAll(fullPayload);
    return { message: 'Notificación enviada a todos los suscriptores.' };
  }

  @Get('my-notifications')
  findMyNotifications(@Request() req: { user: User }) {
    return this.notificationsService.findMyNotifications(req.user.id);
  }
  
  /**
   * NUEVO ENDPOINT: Obtiene el historial completo de notificaciones para el Admin.
   */
  @Get('history')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  getHistory() {
    return this.notificationsService.getHistory();
  }
  
  @Patch('mark-as-read')
  markAsRead(@Request() req: { user: User }, @Body() body: MarkAsReadDto) {
    return this.notificationsService.markAsRead(req.user.id, body.notificationIds);
  }

  @Delete(':id')
  deleteForUser(@Request() req: { user: User }, @Param('id', ParseUUIDPipe) id: string) {
      return this.notificationsService.deleteForUser(req.user.id, id);
  }

  @Post(':id/feedback')
  giveFeedback(@Param('id', ParseUUIDPipe) id: string, @Body() feedbackDto: FeedbackDto) {
      return this.notificationsService.giveFeedback(id, feedbackDto.feedback);
  }
}