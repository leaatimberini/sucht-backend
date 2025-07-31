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

  /**
   * Actualiza una o más configuraciones usando el DTO.
   * Utiliza "upsert" para crear o actualizar las claves de forma eficiente.
   * @param updateConfigurationDto Los datos a actualizar (ej. { metaPixelId: '123' }).
   */
  async updateConfiguration(updateConfigurationDto: UpdateConfigurationDto): Promise<void> {
    const updatePromises = Object.entries(updateConfigurationDto).map(
      ([key, value]) => {
        if (value !== null && value !== undefined) {
          return this.configRepository.upsert(
            { key, value: String(value) },
            ['key'], // Si la 'key' ya existe, se actualiza el 'value'.
          );
        }
      },
    );
    await Promise.all(updatePromises);
  }

  /**
   * Obtiene un valor de configuración específico.
   * @param key La clave de la configuración a buscar.
   * @returns El valor como string, o null si no se encuentra.
   */
  async get(key: string): Promise<string | null> {
    const config = await this.configRepository.findOne({ where: { key } });
    return config ? config.value : null;
  }

  /**
   * Obtiene todas las configuraciones y las devuelve como un único objeto.
   * Ideal para que el frontend obtenga todos los settings de una vez.
   * @returns Un objeto como { metaPixelId: '123', googleAnalyticsId: 'G-XYZ' }.
   */
  async getFormattedConfig(): Promise<{ [key: string]: string }> {
    const configurations = await this.configRepository.find();
    return configurations.reduce((acc, config) => {
      acc[config.key] = config.value;
      return acc;
    }, {});
  }
}