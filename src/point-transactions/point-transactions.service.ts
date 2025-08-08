// backend/src/point-transactions/point-transactions.service.ts

import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PointTransaction, PointTransactionReason } from './point-transaction.entity';
import { User } from 'src/users/user.entity';
import { ConfigurationService } from 'src/configuration/configuration.service';
import { Event } from 'src/events/event.entity';

@Injectable()
export class PointTransactionsService {
  private readonly logger = new Logger(PointTransactionsService.name);

  constructor(
    @InjectRepository(PointTransaction)
    private transactionsRepository: Repository<PointTransaction>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
    private dataSource: DataSource,
    private configurationService: ConfigurationService,
  ) {}

  async createTransaction(
    user: User,
    points: number,
    reason: PointTransactionReason,
    description: string,
    relatedEntityId?: string,
  ): Promise<PointTransaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Obtenemos el estado más reciente del usuario dentro de la transacción
      const currentUser = await queryRunner.manager.findOneBy(User, { id: user.id });
      if(!currentUser) throw new Error('Usuario no encontrado durante la transacción');

      const newTotalPoints = currentUser.points + points;
      await queryRunner.manager.update(User, user.id, { points: newTotalPoints });

      const transaction = this.transactionsRepository.create({
        user,
        userId: user.id,
        points,
        reason,
        description,
        relatedEntityId,
      });
      const savedTransaction = await queryRunner.manager.save(transaction);
      
      await queryRunner.commitTransaction();
      
      this.logger.log(`Transacción creada para ${user.email}: ${points} puntos por ${reason}. Nuevo total: ${newTotalPoints}`);
      return savedTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Falló la transacción de puntos para ${user.email}`, error);
      throw new InternalServerErrorException('No se pudo completar la transacción de puntos.');
    } finally {
      await queryRunner.release();
    }
  }

  async getHistoryForUser(userId: string): Promise<PointTransaction[]> {
    return this.transactionsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Otorga puntos a un usuario por compartir un evento en redes sociales.
   */
  async awardPointsForSocialShare(user: User, eventId: string): Promise<PointTransaction | null> {
    const pointsValue = await this.configurationService.get('points_social_share');
    const pointsToAward = pointsValue ? parseInt(pointsValue, 10) : 10; // 10 puntos por defecto

    if (pointsToAward <= 0) {
      this.logger.log(`La recompensa por compartir está desactivada (0 puntos). No se creará transacción para ${user.email}.`);
      return null;
    }
    
    const event = await this.eventsRepository.findOneBy({ id: eventId });
    const description = event 
      ? `Por compartir el evento: ${event.title}`
      : `Por compartir un evento`;

    return this.createTransaction(
      user,
      pointsToAward,
      PointTransactionReason.SOCIAL_SHARE,
      description,
      eventId
    );
  }
}