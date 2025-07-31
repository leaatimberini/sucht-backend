import { Injectable, Logger } from '@nestjs/common';
import * as webPush from 'web-push';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushSubscription } from './entities/subscription.entity';
import { User } from 'src/users/user.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(PushSubscription)
    private readonly subscriptionRepository: Repository<PushSubscription>,
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
   * Guarda o actualiza una suscripción en la base de datos.
   * @param user El usuario que se suscribe.
   * @param subscriptionData Los datos de la suscripción del navegador.
   */
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
  
  /**
   * Verifica si un usuario tiene al menos una suscripción activa.
   * @param userId El ID del usuario a verificar.
   */
  async isUserSubscribed(userId: string): Promise<boolean> {
    const count = await this.subscriptionRepository.count({ where: { user: { id: userId } } });
    return count > 0;
  }
  
  /**
   * Envía una notificación a todos los suscriptores.
   * @param payload El contenido del mensaje: { title, body, icon }
   */
  async sendNotificationToAll(payload: object) {
    const allSubscriptions = await this.subscriptionRepository.find();
    this.logger.log(`Enviando notificación a ${allSubscriptions.length} suscriptores.`);
    
    const notificationPayload = JSON.stringify(payload);
    const promises = allSubscriptions.map(sub => this.sendNotification(sub, notificationPayload));
    
    await Promise.all(promises);
  }

  /**
   * Envía una notificación a un usuario específico (a todos sus dispositivos).
   * @param userId El ID del usuario a notificar.
   * @param payload El contenido del mensaje.
   */
  async sendNotificationToUser(userId: string, payload: object) {
    const userSubscriptions = await this.subscriptionRepository.find({ where: { user: { id: userId } } });
    this.logger.log(`Enviando notificación a los ${userSubscriptions.length} dispositivos del usuario ${userId}.`);

    const notificationPayload = JSON.stringify(payload);
    const promises = userSubscriptions.map(sub => this.sendNotification(sub, notificationPayload));
    
    await Promise.all(promises);
  }

  /**
   * Lógica base para enviar una notificación a una suscripción y manejar errores.
   * Si la suscripción ha expirado (error 410), la elimina de la base de datos.
   */
  private async sendNotification(subscription: PushSubscription, payload: string) {
    try {
      await webPush.sendNotification(subscription, payload);
    } catch (error) {
      this.logger.error(`Error enviando notificación a ${subscription.endpoint.slice(-10)}`, error.body);
      // "410 Gone" significa que la suscripción ya no es válida y debe ser eliminada.
      if (error.statusCode === 410) {
        this.logger.warn(`Suscripción expirada. Eliminando de la base de datos.`);
        await this.subscriptionRepository.delete(subscription.id);
      }
    }
  }
}