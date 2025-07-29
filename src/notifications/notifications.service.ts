import { Injectable } from '@nestjs/common';
import * as webPush from 'web-push';

// Guardaremos las suscripciones en memoria por ahora.
// En una aplicación real, esto debería ir en la base de datos.
const subscriptions = {};

@Injectable()
export class NotificationsService {
  constructor() {
    // Configura web-push con tus claves VAPID
    webPush.setVapidDetails(
      'mailto:sucht.castelar@gmail.com', // Un email de contacto
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );
  }

  // Guarda la suscripción de un usuario
  addSubscription(userId: string, subscription: any) {
    subscriptions[userId] = subscription;
    console.log(`Usuario ${userId} suscrito a notificaciones.`);
  }

  // Envía una notificación a un usuario específico
  async sendNotification(userId: string, payload: any) {
    const subscription = subscriptions[userId];
    if (subscription) {
      try {
        await webPush.sendNotification(subscription, JSON.stringify(payload));
        console.log(`Notificación enviada a ${userId}.`);
      } catch (error) {
        console.error('Error enviando notificación, puede que la suscripción haya expirado.', error);
      }
    }
  }
}