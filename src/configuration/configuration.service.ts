import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Configuration } from './configuration.entity';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';

@Injectable()
export class ConfigurationService {
  private readonly logger = new Logger(ConfigurationService.name);

  constructor(
    @InjectRepository(Configuration)
    private configRepository: Repository<Configuration>,
  ) {}

  async updateConfiguration(updateConfigurationDto: UpdateConfigurationDto): Promise<void> {
    this.logger.log(`[updateConfiguration] Recibido DTO para actualizar: ${JSON.stringify(updateConfigurationDto)}`);

    for (const [key, value] of Object.entries(updateConfigurationDto)) {
      if (value !== null && value !== undefined) {
        // Si el valor es un array (para enabledPaymentMethods), lo convertimos a string
        const valueToStore = Array.isArray(value) ? value.join(',') : String(value);

        this.logger.log(`[updateConfiguration] Guardando -> key: '${key}', value: '${valueToStore}'`);
        
        await this.configRepository.upsert(
          { key, value: valueToStore },
          ['key'],
        );
      }
    }
    this.logger.log(`[updateConfiguration] Todas las configuraciones han sido guardadas.`);
  }

  async get(key: string): Promise<string | null> {
    this.logger.log(`[get] Buscando configuración para la clave: '${key}'`);
    const config = await this.configRepository.findOne({ where: { key } });
    
    this.logger.log(`[get] Valor encontrado para '${key}': ${config ? `'${config.value}'` : 'null'}`);
    return config ? config.value : null;
  }

  async getFormattedConfig(): Promise<{ [key: string]: any }> {
    const configurations = await this.configRepository.find();
    
    return configurations.reduce((acc, config) => {
      let parsedValue: any = config.value;
      
      // Caso especial para enabledPaymentMethods
      if (config.key === 'enabledPaymentMethods') {
        parsedValue = config.value.split(',').filter(Boolean); // Convierte a array
      } else if (config.value === 'true') {
        parsedValue = true;
      } else if (config.value === 'false') {
        parsedValue = false;
      } else if (!isNaN(Number(config.value)) && !isNaN(parseFloat(config.value)) && config.value !== '') {
        parsedValue = parseFloat(config.value);
      }
      
      acc[config.key] = parsedValue;
      return acc;
    }, {});
  }
}