import { Injectable } from '@nestjs/common';
import * as webPush from 'web-push';

// En una app real, esto se guardaría en la base de datos.
const subscriptions: { [userId: string]: webPush.PushSubscription } = {};

@Injectable()
export class NotificationsService {
  constructor() {
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webPush.setVapidDetails(
        'mailto:sucht.castelar@gmail.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY,
      );
    } else {
      console.warn('VAPID keys no están configuradas. Las notificaciones push no funcionarán.');
    }
  }

  addSubscription(userId: string, subscription: any) {
    subscriptions[userId] = subscription;
    console.log(`Usuario ${userId} suscrito a notificaciones.`);
  }

  // --- NUEVA FUNCIÓN ---
  async sendNotificationToAll(payload: { title: string; body: string; icon: string }) {
    const notificationPayload = JSON.stringify(payload);
    const promises = Object.values(subscriptions).map(sub => 
      webPush.sendNotification(sub, notificationPayload).catch(err => {
        // Si una suscripción es inválida (ej. el usuario borró los datos), la eliminamos.
        console.error("Error enviando notificación, podría estar expirada.", err.statusCode);
      })
    );
    await Promise.all(promises);
  }

  // La función de prueba se mantiene por si es útil
  async sendNotification(userId: string, payload: any) {
    const subscription = subscriptions[userId];
    if (subscription) {
      try {
        await webPush.sendNotification(subscription, JSON.stringify(payload));
        console.log(`Notificación enviada a ${userId}.`);
      } catch (error) {
        console.error('Error enviando notificación', error);
      }
    }
  }
}