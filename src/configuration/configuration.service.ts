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

  /**
   * MÉTODO CORREGIDO: Procesa las actualizaciones de forma secuencial para garantizar el guardado.
   */
  async updateConfiguration(updateConfigurationDto: UpdateConfigurationDto): Promise<void> {
    this.logger.log(`[updateConfiguration] Recibido DTO para actualizar: ${JSON.stringify(updateConfigurationDto)}`);

    // Usamos un bucle for...of para procesar cada clave una por una
    for (const [key, value] of Object.entries(updateConfigurationDto)) {
      if (value !== null && value !== undefined) {
        this.logger.log(`[updateConfiguration] Guardando -> key: '${key}', value: '${String(value)}'`);
        
        // El 'await' dentro del bucle asegura que cada 'upsert' se complete
        // antes de iniciar el siguiente.
        await this.configRepository.upsert(
          { key, value: String(value) },
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

  async getFormattedConfig(): Promise<{ [key: string]: string | boolean | number }> {
    const configurations = await this.configRepository.find();
    
    return configurations.reduce((acc, config) => {
      let parsedValue: string | boolean | number = config.value;
      if (config.value === 'true') {
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