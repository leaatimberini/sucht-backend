import { Injectable, Logger, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import * as webPush from 'web-push';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PushSubscription } from './entities/subscription.entity';
import { User } from 'src/users/user.entity';
import { Notification } from './entities/notification.entity';
import { UsersService } from 'src/users/users.service';

import { MailService } from 'src/mail/mail.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(PushSubscription)
    private readonly subscriptionRepository: Repository<PushSubscription>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webPush.setVapidDetails(
        `mailto:${process.env.VAPID_MAILTO || 'sucht.castelar@gmail.com'}`,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY,
      );
    } else {
      this.logger.warn('VAPID keys no están configuradas. Las notificaciones push no funcionarán.');
    }
  }

  private async createNotification(user: User, title: string, body: string): Promise<Notification> {
    const notification = this.notificationRepository.create({
      user,
      title,
      body,
    });
    return this.notificationRepository.save(notification);
  }

  async addSubscription(user: User, subscriptionData: webPush.PushSubscription) {
    const existingSubscription = await this.subscriptionRepository.findOne({ where: { endpoint: subscriptionData.endpoint } });
    if (existingSubscription) {
      if (existingSubscription.user?.id !== user.id) {
        existingSubscription.user = user;
        return this.subscriptionRepository.save(existingSubscription);
      }
      return existingSubscription;
    }
    const newSubscription = this.subscriptionRepository.create({
      ...subscriptionData,
      user: user,
    });
    return this.subscriptionRepository.save(newSubscription);
  }

  async removeSubscription(endpoint: string, userId: string) {
    const result = await this.subscriptionRepository.delete({ endpoint, user: { id: userId } });
    if (result.affected === 0) {
      this.logger.warn(`Intento de eliminar una suscripción no encontrada para el endpoint: ${endpoint}`);
    }
    return { message: 'Suscripción eliminada' };
  }

  async isUserSubscribed(userId: string): Promise<boolean> {
    const count = await this.subscriptionRepository.count({ where: { user: { id: userId } } });
    return count > 0;
  }

  async sendNotificationToAll(payload: { title: string; body: string; icon?: string }) {
    const allUsers = await this.usersService.findAllWithoutPagination();
    this.logger.log(`Creando notificaciones para ${allUsers.length} usuarios.`);

    // Batch insert notifications
    const notificationsToInsert = allUsers.map(user => this.notificationRepository.create({
      user,
      title: payload.title,
      body: payload.body,
    }));

    // Process in chunks of 500 to avoid memory/query limits
    const chunkSize = 500;
    for (let i = 0; i < notificationsToInsert.length; i += chunkSize) {
      const chunk = notificationsToInsert.slice(i, i + chunkSize);
      await this.notificationRepository.insert(chunk);
    }

    const allSubscriptions = await this.subscriptionRepository.find();
    this.logger.log(`Enviando notificación push a ${allSubscriptions.length} suscriptores.`);
    const notificationPayload = JSON.stringify(payload);
    const promises = allSubscriptions.map(sub => this.sendNotification(sub, notificationPayload));

    await Promise.all(promises);
  }

  async sendNotificationToUser(user: User, payload: { title: string; body: string; icon?: string }) {
    await this.createNotification(user, payload.title, payload.body);

    const userSubscriptions = await this.subscriptionRepository.find({ where: { user: { id: user.id } } });
    this.logger.log(`Enviando notificación push a los ${userSubscriptions.length} dispositivos del usuario ${user.id}.`);

    const notificationPayload = JSON.stringify(payload);
    const promises = userSubscriptions.map(sub => this.sendNotification(sub, notificationPayload));

    await Promise.all(promises);
  }

  private async sendNotification(subscription: PushSubscription, payload: string) {
    try {
      await webPush.sendNotification(subscription, payload);
    } catch (error) {
      this.logger.error(`Error enviando notificación a ${subscription.endpoint.slice(-10)}`, error.body);
      if (error.statusCode === 410) {
        this.logger.warn(`Suscripción expirada. Eliminando de la base de datos.`);
        await this.subscriptionRepository.delete(subscription.id);
      }
    }
  }

  async findMyNotifications(userId: string) {
    const notifications = await this.notificationRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return {
      notifications,
      unreadCount,
    };
  }

  async markAsRead(userId: string, notificationIds: string[]) {
    if (!notificationIds || notificationIds.length === 0) {
      return { message: 'No se proveyeron IDs de notificaciones.' };
    }

    await this.notificationRepository.update(
      { user: { id: userId }, id: In(notificationIds) },
      { isRead: true }
    );

    return { message: 'Notificaciones marcadas como leídas.' };
  }

  async deleteForUser(userId: string, notificationId: string) {
    const result = await this.notificationRepository.delete({ id: notificationId, user: { id: userId } });
    if (result.affected === 0) {
      throw new NotFoundException('Notificación no encontrada o no pertenece al usuario.');
    }
    return { message: 'Notificación eliminada.' };
  }

  async giveFeedback(notificationId: string, feedback: 'like' | 'dislike') {
    const notification = await this.notificationRepository.findOneBy({ id: notificationId });
    if (!notification) {
      throw new NotFoundException('Notificación no encontrada.');
    }

    if (feedback === 'like') {
      notification.likes += 1;
    } else if (feedback === 'dislike') {
      notification.dislikes += 1;
    } else {
      throw new BadRequestException('Feedback inválido.');
    }

    return this.notificationRepository.save(notification);
  }

  async getHistory(): Promise<Notification[]> {
    return this.notificationRepository.find({
      order: {
        createdAt: 'DESC'
      },
      take: 100
    });
  }

  async sendEmail(to: string, subject: string, html: string) {
    return this.mailService.sendMail(to, subject, html);
  }
}