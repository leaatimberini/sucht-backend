// backend/src/rewards/rewards.service.ts

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Reward } from './reward.entity';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { User } from 'src/users/user.entity';
import { PointTransactionsService } from 'src/point-transactions/point-transactions.service';
import { PointTransaction, PointTransactionReason } from 'src/point-transactions/point-transaction.entity';
import { UserReward } from './user-reward.entity';

@Injectable()
export class RewardsService {
  private readonly logger = new Logger(RewardsService.name);

  constructor(
    @InjectRepository(Reward)
    private rewardsRepository: Repository<Reward>,
    @InjectRepository(UserReward)
    private userRewardsRepository: Repository<UserReward>,
    private pointTransactionsService: PointTransactionsService,
    private dataSource: DataSource,
  ) {}

  async create(createRewardDto: CreateRewardDto): Promise<Reward> {
    const newReward = this.rewardsRepository.create(createRewardDto);
    return this.rewardsRepository.save(newReward);
  }

  async findAll(): Promise<Reward[]> {
    return this.rewardsRepository.find({ order: { pointsCost: 'ASC' } });
  }

  async findOne(id: string): Promise<Reward> {
    const reward = await this.rewardsRepository.findOneBy({ id });
    if (!reward) {
      throw new NotFoundException(`Reward with ID "${id}" not found`);
    }
    return reward;
  }

  async update(id: string, updateRewardDto: UpdateRewardDto): Promise<Reward> {
    const reward = await this.findOne(id);
    this.rewardsRepository.merge(reward, updateRewardDto);
    return this.rewardsRepository.save(reward);
  }

  async remove(id: string): Promise<void> {
    const result = await this.rewardsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Reward with ID "${id}" not found`);
    }
  }

  /**
   * Permite a un usuario canjear un premio con sus puntos.
   * Utiliza una transacción para asegurar la consistencia.
   */
  async redeem(rewardId: string, user: User): Promise<UserReward> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    this.logger.log(`[redeem] Usuario ${user.email} intentando canjear premio ${rewardId}`);

    try {
      // Usamos el queryRunner para asegurar que todas las operaciones usen la misma transacción
      const reward = await queryRunner.manager.findOneBy(Reward, { id: rewardId });
      const currentUserState = await queryRunner.manager.findOneBy(User, { id: user.id });

      if (!reward) throw new NotFoundException('Premio no encontrado.');
      if (!currentUserState) throw new NotFoundException('Usuario no encontrado.'); // Chequeo de seguridad adicional
      if (!reward.isActive) throw new BadRequestException('Este premio no está activo actualmente.');
      if (currentUserState.points < reward.pointsCost) throw new BadRequestException('No tienes suficientes puntos.');
      if (reward.stock !== null && reward.stock <= 0) throw new BadRequestException('Este premio está agotado.');

      // 1. Restar el stock del premio (si es limitado)
      if (reward.stock !== null) {
        reward.stock -= 1;
        await queryRunner.manager.save(reward);
      }
      
      // 2. Crear la transacción para restar los puntos
      const newTotalPoints = currentUserState.points - reward.pointsCost;
      await queryRunner.manager.update(User, user.id, { points: newTotalPoints });

      const pointTransaction = queryRunner.manager.create(PointTransaction, {
        user: currentUserState,
        userId: user.id,
        points: -reward.pointsCost,
        reason: PointTransactionReason.REWARD_REDEMPTION,
        description: `Canje del premio: ${reward.name}`,
        relatedEntityId: reward.id,
      });
      await queryRunner.manager.save(pointTransaction);

      // 3. Crear el registro del premio canjeado por el usuario
      const userReward = this.userRewardsRepository.create({
        user: currentUserState,
        userId: user.id,
        reward,
        rewardId: reward.id,
      });
      const savedUserReward = await queryRunner.manager.save(userReward);

      await queryRunner.commitTransaction();
      this.logger.log(`[redeem] Canje exitoso para ${user.email}. Se generó UserReward ID: ${savedUserReward.id}. Puntos restantes: ${newTotalPoints}`);
      return savedUserReward;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`[redeem] Falló el canje para el usuario ${user.email}`, error);
      // Re-lanzamos el error original para que el controlador lo maneje
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}