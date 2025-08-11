// src/configuration/configuration.service.ts
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
        // Solo procesamos valores que no sean nulos o indefinidos
        if (value !== null && value !== undefined) {
          // Guardamos todo como string en la BD para consistencia.
          // El booleano 'true' se convierte en el string "true".
          return this.configRepository.upsert(
            { key, value: String(value) },
            ['key'], // Si la 'key' ya existe, la actualiza (update); si no, la inserta (insert).
          );
        }
        return Promise.resolve();
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
    
    // Este método lee todos los strings de la BD y los devuelve a la API con sus tipos correctos.
    return configurations.reduce((acc, config) => {
      let parsedValue: string | boolean | number = config.value;
      
      // Intentamos convertir a booleano
      if (config.value === 'true') {
        parsedValue = true;
      } else if (config.value === 'false') {
        parsedValue = false;
      // Intentamos convertir a número
      } else if (!isNaN(Number(config.value)) && !isNaN(parseFloat(config.value)) && config.value !== '') {
        parsedValue = parseFloat(config.value);
      }
      
      acc[config.key] = parsedValue;
      return acc;
    }, {});
  }
}