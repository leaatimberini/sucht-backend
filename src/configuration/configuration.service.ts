// backend/src/configuration/configuration.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Configuration } from './configuration.entity';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';

@Injectable()
export class ConfigurationService {
  constructor(
    @InjectRepository(Configuration)
    private configRepository: Repository<Configuration>,
  ) {}

  async updateConfiguration(updateConfigurationDto: UpdateConfigurationDto): Promise<void> {
    const updatePromises = Object.entries(updateConfigurationDto).map(
      ([key, value]) => {
        // Solo actualizamos si el valor no es nulo o indefinido
        if (value !== null && value !== undefined) {
          return this.configRepository.upsert(
            { key, value: String(value) },
            ['key'],
          );
        }
      },
    );
    await Promise.all(updatePromises);
  }

  async get(key: string): Promise<string | null> {
    const config = await this.configRepository.findOne({ where: { key } });
    return config ? config.value : null;
  }

  async getFormattedConfig(): Promise<{ [key: string]: string | boolean | number }> {
    const configurations = await this.configRepository.find();
    return configurations.reduce((acc, config) => {
      // Intentamos inferir el tipo de dato al devolverlo
      let parsedValue: string | boolean | number = config.value;
      if (config.value === 'true') {
        parsedValue = true;
      } else if (config.value === 'false') {
        parsedValue = false;
      } else if (!isNaN(Number(config.value)) && !isNaN(parseFloat(config.value))) {
        parsedValue = parseFloat(config.value);
      }
      
      acc[config.key] = parsedValue;
      return acc;
    }, {});
  }
}