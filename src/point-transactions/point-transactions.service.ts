// backend/src/point-transactions/point-transactions.service.ts

import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PointTransaction, PointTransactionReason } from './point-transaction.entity';
import { User } from 'src/users/user.entity';

@Injectable()
export class PointTransactionsService {
  private readonly logger = new Logger(PointTransactionsService.name);

  constructor(
    @InjectRepository(PointTransaction)
    private transactionsRepository: Repository<PointTransaction>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private dataSource: DataSource, // Inyectamos el DataSource para manejar transacciones
  ) {}

  /**
   * Método central para crear una transacción de puntos.
   * Utiliza una transacción de base de datos para asegurar la consistencia de los datos.
   */
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
      // 1. Actualizar el balance de puntos del usuario
      const newTotalPoints = user.points + points;
      await queryRunner.manager.update(User, user.id, { points: newTotalPoints });

      // 2. Crear y guardar el registro de la transacción
      const transaction = this.transactionsRepository.create({
        user,
        userId: user.id,
        points,
        reason,
        description,
        relatedEntityId,
      });
      const savedTransaction = await queryRunner.manager.save(transaction);
      
      // 3. Si todo va bien, confirmamos la transacción
      await queryRunner.commitTransaction();
      
      this.logger.log(`Transacción creada para ${user.email}: ${points} puntos por ${reason}. Nuevo total: ${newTotalPoints}`);
      return savedTransaction;
    } catch (error) {
      // 4. Si algo falla, revertimos todos los cambios
      await queryRunner.rollbackTransaction();
      this.logger.error(`Falló la transacción de puntos para ${user.email}`, error);
      throw new InternalServerErrorException('No se pudo completar la transacción de puntos.');
    } finally {
      // 5. Siempre liberamos el queryRunner
      await queryRunner.release();
    }
  }

  /**
   * Obtiene el historial de transacciones de puntos para un usuario específico.
   */
  async getHistoryForUser(userId: string): Promise<PointTransaction[]> {
    return this.transactionsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}