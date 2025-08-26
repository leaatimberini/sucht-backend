// src/payments/talo.service.ts
import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CreateTaloPreferenceDto } from './dto/create-talo-preference.dto';
import { User } from 'src/users/user.entity';

@Injectable()
export class TaloService {
  private readonly logger = new Logger(TaloService.name);
  private readonly taloApiUrl = 'https://talo.com.ar/api/v1';
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(private readonly configService: ConfigService) {
    // 1. Leemos SOLO las credenciales globales necesarias
    const id = this.configService.get<string>('TALO_CLIENT_ID');
    const secret = this.configService.get<string>('TALO_CLIENT_SECRET');
    const uri = this.configService.get<string>('TALO_REDIRECT_URI');

    // 2. Verificamos que existan
    if (!id || !secret || !uri) {
      this.logger.error('Las credenciales globales de Talo (ID, Secret, Redirect URI) no están configuradas en .env');
      throw new Error('Credenciales de Talo no configuradas.');
    }

    this.clientId = id;
    this.clientSecret = secret;
    this.redirectUri = uri;
  }

  /**
   * Genera la URL de autorización para vincular la cuenta de Talo de un usuario
   */
  getTaloAuthUrl(userId: string): { authUrl: string } {
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    const authUrl = `https://talo.com.ar/oauth/authorize?response_type=code&client_id=${this.clientId}&redirect_uri=${this.redirectUri}&scope=read+write&state=${state}`;
    return { authUrl };
  }

  /**
   * Intercambia el código de autorización por tokens de acceso/refresh
   */
  async exchangeCodeForTokens(code: string): Promise<any> {
    try {
      const response = await axios.post(`${this.taloApiUrl}/oauth/token`, {
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
      });
      return response.data; // { access_token, refresh_token, expires_in, ... }
    } catch (error) {
      this.logger.error('Error al intercambiar el código de Talo por tokens:', error.response?.data || error.message);
      throw new InternalServerErrorException('No se pudo obtener el token de acceso de Talo.');
    }
  }

  /**
   * Crea una preferencia de pago en Talo usando el token del usuario dueño (owner/admin/rrpp)
   */
  async createPreference(user: User, preferenceDto: CreateTaloPreferenceDto) {
    if (!user.taloAccessToken) {
      this.logger.error(`El usuario ${user.id} no tiene vinculada una cuenta de Talo.`);
      throw new InternalServerErrorException('El usuario no tiene vinculada una cuenta de Talo.');
    }

    this.logger.log(`Creando preferencia de pago en Talo para: ${preferenceDto.description}, usuario: ${user.id}`);

    try {
      const response = await axios.post(
        `${this.taloApiUrl}/checkouts`,
        preferenceDto,
        {
          headers: {
            'Authorization': `Bearer ${user.taloAccessToken}`,
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

  /**
   * Manejo del webhook de Talo
   */
  async handleWebhook(payload: any) {
    this.logger.log('Webhook de Talo recibido:', payload);
    // TODO: actualizar estados de pagos en DB
    return { received: true };
  }
}
