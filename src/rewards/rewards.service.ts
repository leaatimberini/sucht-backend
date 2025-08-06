import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reward } from './reward.entity';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';

@Injectable()
export class RewardsService {
  constructor(
    @InjectRepository(Reward)
    private rewardsRepository: Repository<Reward>,
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
}