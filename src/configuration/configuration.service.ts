import { Injectable, Logger } from '@nestjs/common'; // 1. Importar Logger
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Configuration } from './configuration.entity';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';

@Injectable()
export class ConfigurationService {
  // 2. Crear una instancia del Logger
  private readonly logger = new Logger(ConfigurationService.name);

  constructor(
    @InjectRepository(Configuration)
    private configRepository: Repository<Configuration>,
  ) {}

  async updateConfiguration(updateConfigurationDto: UpdateConfigurationDto): Promise<void> {
    // 3. Log para ver qué datos llegan al servicio
    this.logger.log(`[updateConfiguration] Recibido DTO para actualizar: ${JSON.stringify(updateConfigurationDto)}`);

    const updatePromises = Object.entries(updateConfigurationDto).map(
      ([key, value]) => {
        if (value !== null && value !== undefined) {
          // 4. Log para ver exactamente qué se va a guardar
          this.logger.log(`[updateConfiguration] Intentando guardar -> key: '${key}', value: '${String(value)}'`);
          
          return this.configRepository.upsert(
            { key, value: String(value) },
            ['key'],
          );
        }
        return Promise.resolve();
      },
    );
    await Promise.all(updatePromises);
    this.logger.log(`[updateConfiguration] Promesas de guardado finalizadas.`);
  }

  async get(key: string): Promise<string | null> {
    // 5. Log para ver qué clave se está pidiendo
    this.logger.log(`[get] Buscando configuración para la clave: '${key}'`);
    const config = await this.configRepository.findOne({ where: { key } });
    
    // 6. Log para ver qué se encontró en la base de datos
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