import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CreateTaloPreferenceDto } from './dto/create-talo-preference.dto';

@Injectable()
export class TaloService {
  private readonly logger = new Logger(TaloService.name);
  private readonly taloApiUrl = 'https://talo.com.ar/api/v1';
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    const key = this.configService.get<string>('TALO_API_KEY');
    if (!key) {
      this.logger.error('La API Key de Talo no está configurada en las variables de entorno (TALO_API_KEY).');
      throw new Error('TALO_API_KEY is not configured.');
    }
    this.apiKey = key;
  }

  async createPreference(preferenceDto: CreateTaloPreferenceDto) {
    this.logger.log(`Creando preferencia de pago en Talo para: ${preferenceDto.description}`);
    
    try {
      const response = await axios.post(
        `${this.taloApiUrl}/checkouts`,
        preferenceDto,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      
      this.logger.log(`Preferencia de Talo creada con ID: ${response.data.id}`);
      return response.data;
    } catch (error) {
      this.logger.error('Error al crear la preferencia de Talo:', error.response?.data || error.message);
      throw new InternalServerErrorException('No se pudo crear la preferencia de pago con Talo.');
    }
  }

  async handleWebhook(payload: any) {
    this.logger.log('Webhook de Talo recibido:', payload);
    return { received: true };
  }
}