import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Configuration } from './configuration.entity';

@Injectable()
export class ConfigurationService {
  constructor(
    @InjectRepository(Configuration)
    private configRepository: Repository<Configuration>,
  ) {}

  /**
   * Guarda o actualiza un valor de configuración en la base de datos.
   * @param key La clave de la configuración (ej. 'adminServiceFee')
   * @param value El valor a guardar
   * @returns La entidad de configuración guardada.
   */
  async set(key: string, value: string): Promise<Configuration> {
    let config = await this.configRepository.findOne({ where: { key } });
    if (config) {
      // Si la clave ya existe, actualiza su valor
      config.value = value;
    } else {
      // Si no existe, crea una nueva entrada
      config = this.configRepository.create({ key, value });
    }
    return this.configRepository.save(config);
  }

  /**
   * Obtiene un valor de configuración de la base de datos.
   * @param key La clave de la configuración a buscar.
   * @returns El valor como string, o null si no se encuentra.
   */
  async get(key: string): Promise<string | null> {
    const config = await this.configRepository.findOne({ where: { key } });
    return config ? config.value : null;
  }
}
