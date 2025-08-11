import { Injectable, Logger } from '@nestjs/common';
import * as webPush from 'web-push';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PushSubscription } from './entities/subscription.entity';
import { User } from 'src/users/user.entity';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(PushSubscription)
    private readonly subscriptionRepository: Repository<PushSubscription>,
    // 1. Inyectamos el repositorio para la entidad Notification
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
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
  
  /**
   * Guarda una notificación en la base de datos para un usuario.
   */
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
      this.logger.debug(`Suscripción ya existente para el endpoint. Actualizando usuario si es necesario.`);
      existingSubscription.user = user;
      return this.subscriptionRepository.save(existingSubscription);
    }

    const newSubscription = this.subscriptionRepository.create({
      ...subscriptionData,
      user: user,
    });

    return this.subscriptionRepository.save(newSubscription);
  }
  
  async isUserSubscribed(userId: string): Promise<boolean> {
    const count = await this.subscriptionRepository.count({ where: { user: { id: userId } } });
    return count > 0;
  }
  
  async sendNotificationToAll(payload: { title: string, body: string, icon?: string }) {
    const allSubscriptions = await this.subscriptionRepository.find({ relations: ['user'] });
    this.logger.log(`Enviando notificación a ${allSubscriptions.length} suscriptores.`);
    
    const notificationPayload = JSON.stringify(payload);
    
    // NOTA: Enviar y guardar notificaciones a potencialmente miles de usuarios
    // debería manejarse en un proceso en segundo plano (job queue) para no bloquear el servidor.
    // Por ahora, lo hacemos de forma directa.
    const promises = allSubscriptions.map(async (sub) => {
      // Guardamos una copia de la notificación para cada usuario
      await this.createNotification(sub.user, payload.title, payload.body);
      return this.sendNotification(sub, notificationPayload);
    });
    
    await Promise.all(promises);
  }

  async sendNotificationToUser(user: User, payload: { title: string, body: string, icon?: string }) {
    // 2. Ahora guardamos la notificación en la base de datos
    await this.createNotification(user, payload.title, payload.body);
    
    const userSubscriptions = await this.subscriptionRepository.find({ where: { user: { id: user.id } } });
    this.logger.log(`Enviando notificación a los ${userSubscriptions.length} dispositivos del usuario ${user.id}.`);

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

  // --- NUEVOS MÉTODOS PARA EL HEADER ---

  /**
   * Busca las notificaciones para un usuario específico.
   * Devuelve la lista de notificaciones y un contador de las no leídas.
   */
  async findMyNotifications(userId: string) {
    const notifications = await this.notificationRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      take: 20, // Limitamos a las últimas 20 para no sobrecargar
    });

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return {
      notifications,
      unreadCount,
    };
  }
  
  /**
   * Marca notificaciones específicas de un usuario como leídas.
   */
  async markAsRead(userId: string, notificationIds: string[]) {
    // Si no se envían IDs, no hacemos nada.
    if (!notificationIds || notificationIds.length === 0) {
      return { message: 'No se proveyeron IDs de notificaciones.' };
    }
    
    // Actualizamos solo las notificaciones que pertenecen al usuario
    await this.notificationRepository.update(
      { user: { id: userId }, id: In(notificationIds) },
      { isRead: true }
    );
    
    return { message: 'Notificaciones marcadas como leídas.' };
  }
}