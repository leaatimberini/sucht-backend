// src/payments/talo.service.ts
import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CreateTaloPreferenceDto } from './dto/create-talo-preference.dto';

@Injectable()
export class TaloService {
  private readonly logger = new Logger(TaloService.name);
  // CAMBIO: Apuntamos a la URL correcta de la API de Talo.
  private readonly taloApiUrl = 'https://api.talo.com.ar/v1'; 
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(private readonly configService: ConfigService) {
    const id = this.configService.get<string>('TALO_CLIENT_ID');
    const secret = this.configService.get<string>('TALO_CLIENT_SECRET');
    const uri = this.configService.get<string>('TALO_REDIRECT_URI');

    if (!id || !secret || !uri) {
      this.logger.error('Las credenciales globales de Talo (ID, Secret, Redirect URI) no están configuradas en .env');
      throw new Error('Credenciales de Talo no configuradas.');
    }

    this.clientId = id;
    this.clientSecret = secret;
    this.redirectUri = uri;
  }

getTaloAuthUrl(userId: string): { authUrl: string } {
  // Ya no usamos el flujo OAuth tradicional con response_type, state, scope, etc.
  // En partners es directo: redirigís al usuario a esta URL
  const authUrl = `https://app.talo.com.ar/authorize/${this.clientId}?referred_user_id=${userId}`;
  this.logger.log(`URL de autorización de Talo generada: ${authUrl}`);
  return { authUrl };
}

async exchangeCodeForTokens(userId: string): Promise<any> {
  try {
    const response = await axios.post(
      `https://api.talo.com.ar/users/${userId}/tokens`,
      {
        client_id: this.clientId,      // tu partner_id
        client_secret: this.clientSecret
      }
    );
    this.logger.log('Token generado exitosamente para el usuario de Talo.');
    return response.data;
  } catch (error) {
    this.logger.error(
      'Error al generar token de Talo:',
      error.response?.data || error.message
    );
    throw new InternalServerErrorException('No se pudo obtener el token de acceso de Talo.');
  }
}

  async createPreference(accessToken: string, preferenceDto: CreateTaloPreferenceDto) {
    this.logger.log(`Creando preferencia de pago en Talo para: ${preferenceDto.description}`);
    try {
      const response = await axios.post(
        `${this.taloApiUrl}/checkouts`,
        preferenceDto,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
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
    // Aquí iría la lógica para procesar el webhook, similar a la de Mercado Pago.
    // Por ahora, solo confirmamos la recepción.
    return { received: true };
  }
}