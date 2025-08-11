// src/rewards/rewards.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not, IsNull } from 'typeorm';
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
   * Asigna un premio a un usuario de forma gratuita, sin descontar puntos.
   * Ideal para regalos, como el beneficio de cumpleaños.
   * @param user El usuario que recibe el premio.
   * @param rewardId El ID del 'Reward' plantilla (ej. "Champagne de Regalo").
   * @param origin Un string para identificar la fuente de este regalo (ej. "BIRTHDAY").
   */
  async assignFreeReward(user: User, rewardId: string, origin: string): Promise<UserReward> {
    this.logger.log(`[assignFreeReward] Asignando premio gratuito ${rewardId} a ${user.email} con origen ${origin}`);
    
    const reward = await this.findOne(rewardId);
    if (!reward) {
      throw new NotFoundException('La plantilla del premio no fue encontrada.');
    }
    if (!reward.isActive) {
      throw new BadRequestException('Este premio no se encuentra activo.');
    }

    const userReward = this.userRewardsRepository.create({
      user,
      userId: user.id,
      reward,
      rewardId: reward.id,
      origin, // Guardamos la bandera de origen
    });

    const savedUserReward = await this.userRewardsRepository.save(userReward);
    this.logger.log(`[assignFreeReward] Premio gratuito asignado. UserReward ID: ${savedUserReward.id}`);
    
    return savedUserReward;
  }

  async redeem(rewardId: string, user: User): Promise<UserReward> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    this.logger.log(`[redeem] Usuario ${user.email} intentando canjear premio ${rewardId}`);

    try {
      const reward = await queryRunner.manager.findOneBy(Reward, { id: rewardId });
      const currentUserState = await queryRunner.manager.findOneBy(User, { id: user.id });

      if (!reward) throw new NotFoundException('Premio no encontrado.');
      if (!currentUserState) throw new NotFoundException('Usuario no encontrado.');
      if (!reward.isActive) throw new BadRequestException('Este premio no está activo actualmente.');
      if (currentUserState.points < reward.pointsCost) throw new BadRequestException('No tienes suficientes puntos.');
      if (reward.stock !== null && reward.stock <= 0) throw new BadRequestException('Este premio está agotado.');

      if (reward.stock !== null) {
        reward.stock -= 1;
        await queryRunner.manager.save(reward);
      }
      
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

      const userReward = this.userRewardsRepository.create({
        user: currentUserState,
        userId: user.id,
        reward,
        rewardId: reward.id,
        origin: 'LOYALTY', // Los canjes por puntos tienen origen 'LOYALTY'
      });
      const savedUserReward = await queryRunner.manager.save(userReward);

      await queryRunner.commitTransaction();
      this.logger.log(`[redeem] Canje exitoso para ${user.email}. Se generó UserReward ID: ${savedUserReward.id}. Puntos restantes: ${newTotalPoints}`);
      return savedUserReward;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`[redeem] Falló el canje para el usuario ${user.email}`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findUserRewards(userId: string): Promise<UserReward[]> {
    return this.userRewardsRepository.find({
      where: { userId },
      relations: ['reward'],
      order: { createdAt: 'DESC' },
    });
  }

  async validateUserReward(userRewardId: string) {
    this.logger.log(`[validateUserReward] Intento de validación para el UserReward ID: ${userRewardId}`);

    const userReward = await this.userRewardsRepository.findOne({
      where: { id: userRewardId },
      relations: ['user', 'reward'],
    });

    if (!userReward) {
      this.logger.warn(`[validateUserReward] FALLO: QR de premio no encontrado (ID: ${userRewardId})`);
      throw new NotFoundException('QR de premio no válido.');
    }

    if (userReward.redeemedAt !== null) {
      this.logger.warn(`[validateUserReward] FALLO: El premio ya fue canjeado el ${userReward.redeemedAt}`);
      throw new BadRequestException(`Este premio ya fue canjeado el ${userReward.redeemedAt.toLocaleString('es-AR')}.`);
    }

    userReward.redeemedAt = new Date();
    await this.userRewardsRepository.save(userReward);

    this.logger.log(`[validateUserReward] ÉXITO: Premio "${userReward.reward.name}" validado para el usuario ${userReward.user.email}`);

    return {
      message: 'Premio validado con éxito',
      userName: userReward.user.name,
      rewardName: userReward.reward.name,
      redeemedAt: userReward.redeemedAt,
    };
  }

  async getRedeemedRewardsHistory(): Promise<UserReward[]> {
    this.logger.log(`[getRedeemedRewardsHistory] Obteniendo historial de premios canjeados.`);
    return this.userRewardsRepository.find({
      where: {
        redeemedAt: Not(IsNull()),
      },
      relations: ['user', 'reward'],
      order: { redeemedAt: 'DESC' },
    });
  }
  // Añade este nuevo método dentro de la clase RewardsService
  async findBirthdayRewardForUser(userId: string, eventId: string): Promise<UserReward | null> {
    // La relación con el evento es a través del ticket, así que la lógica podría ser más compleja
    // Por ahora, asumimos que se busca por origen y usuario, lo que es suficiente.
    return this.userRewardsRepository.findOne({
        where: {
            userId,
            origin: 'BIRTHDAY'
        },
        relations: ['reward']
    });
  }
}