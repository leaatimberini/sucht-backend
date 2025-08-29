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
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    // CAMBIO: Apuntamos a la URL de la aplicación para el flujo de autorización.
    const authUrl = `https://app.talo.com.ar/oauth/authorize?response_type=code&client_id=${this.clientId}&redirect_uri=${this.redirectUri}&scope=read+write&state=${state}`;
    this.logger.log(`URL de autorización de Talo generada: ${authUrl}`);
    return { authUrl };
  }

  async exchangeCodeForTokens(code: string): Promise<any> {
    try {
      // CAMBIO: Usamos la URL correcta de la API para el intercambio de tokens.
      const response = await axios.post(`${this.taloApiUrl}/oauth/token`, {
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
      });
      this.logger.log('Código intercambiado por tokens de Talo exitosamente.');
      return response.data;
    } catch (error) {
      this.logger.error('Error al intercambiar el código de Talo por tokens:', error.response?.data || error.message);
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