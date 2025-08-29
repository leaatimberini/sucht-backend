// src/payments/mercadopago.service.ts
import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { User } from 'src/users/user.entity';

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);

  constructor(private readonly configService: ConfigService) {}

  async createPreference(
    buyer: User,
    owner: User,
    items: any[],
    externalReference: string,
    backUrls: any,
    notificationUrl: string,
  ) {
    if (!owner.mpAccessToken) {
      this.logger.error('[MercadoPagoService] ERROR CRÍTICO: La cuenta del dueño no tiene un Access Token de MP configurado.');
      throw new InternalServerErrorException("La cuenta del dueño para recibir pagos no está configurada.");
    }

    const mpClient = new MercadoPagoConfig({ accessToken: owner.mpAccessToken });
    const preferenceClient = new Preference(mpClient);

    const preference = await preferenceClient.create({
      body: {
        items,
        back_urls: backUrls,
        notification_url: notificationUrl,
        auto_return: 'approved',
        external_reference: externalReference,
      },
    });

    this.logger.log(`[MercadoPagoService] Preferencia de MP creada con ID: ${preference.id}`);
    return { preferenceId: preference.id, init_point: preference.init_point };
  }
}