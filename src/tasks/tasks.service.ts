// src/tasks/tasks.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';
import { Repository } from 'typeorm';
// Asumimos que tienes un servicio de notificaciones y de puntos de fidelización
// import { NotificationsService } from 'src/notifications/notifications.service';
// import { LoyaltyService } from 'src/loyalty/loyalty.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    
    // Descomentar cuando los servicios existan
    // private readonly notificationsService: NotificationsService,
    // private readonly loyaltyService: LoyaltyService,
  ) {}

  /**
   * Esta tarea se ejecuta todos los días a las 10:00 AM.
   * Busca usuarios que cumplen años y les envía una notificación.
   */
  @Cron(CronExpression.EVERY_DAY_AT_10AM, {
    name: 'birthdayNotifications',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  async handleBirthdayNotifications() {
    this.logger.debug('Ejecutando tarea de notificaciones de cumpleaños...');

    const today = new Date();
    const month = today.getMonth() + 1; // Meses en JS son 0-11, en SQL 1-12
    const day = today.getDate();

    // Query para encontrar usuarios cuyo mes y día de nacimiento coincidan con hoy
    // Usamos funciones de PostgreSQL para ignorar el año.
    const birthdayUsers = await this.usersRepository.createQueryBuilder('user')
      .where('EXTRACT(MONTH FROM user.birthDate) = :month', { month })
      .andWhere('EXTRACT(DAY FROM user.birthDate) = :day', { day })
      .getMany();

    if (birthdayUsers.length === 0) {
      this.logger.debug('No hay cumpleaños hoy.');
      return;
    }

    this.logger.log(`Encontrados ${birthdayUsers.length} cumpleaños hoy. Enviando notificaciones...`);

    for (const user of birthdayUsers) {
      const title = `¡Feliz Cumpleaños, ${user.name}! 🎉`;
      const body = 'El equipo de SUCHT te desea un día increíble. ¡Te esperamos para festejar!';

      // 1. Enviar notificación push (lógica a implementar en NotificationsService)
      // await this.notificationsService.sendToUser(user.id, { title, body });
      this.logger.log(`Simulando envío de notificación a ${user.name}`);
      
      // 2. Otorgar puntos de fidelización (lógica a implementar en LoyaltyService)
      const birthdayPoints = 100; // Ejemplo: 100 puntos de regalo
      // await this.loyaltyService.addPoints(user.id, birthdayPoints, 'BIRTHDAY_BONUS');
      this.logger.log(`Simulando otorgar ${birthdayPoints} puntos a ${user.name}`);
    }
  }
}