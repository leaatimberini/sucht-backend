// src/payments/mercadopago.service.ts

import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference } from 'mercadopago';

@Injectable()
export class MercadoPagoService {
    private readonly logger = new Logger(MercadoPagoService.name);
    private mpClient: MercadoPagoConfig;

    constructor(private readonly configService: ConfigService) {
        const accessToken = this.configService.get<string>('MERCADO_PAGO_ACCESS_TOKEN');
        if (!accessToken) {
            this.logger.error('MERCADO_PAGO_ACCESS_TOKEN no está configurado en .env');
            throw new InternalServerErrorException('La integración con Mercado Pago no está configurada.');
        }
        this.mpClient = new MercadoPagoConfig({ accessToken });
    }

    async createPreference(
        items: any[],
        payer: { email: string; name?: string },
        externalReference: string,
        backUrls: { success: string; failure: string; pending: string },
        notificationUrl: string,
    ) {
        const preferenceBody = {
            items,
            payer,
            back_urls: backUrls,
            notification_url: notificationUrl,
            external_reference: externalReference,
            auto_return: 'approved',
        };

        try {
            this.logger.log(`Creando preferencia con cuerpo: ${JSON.stringify(preferenceBody)}`);
            const preference = new Preference(this.mpClient);
            const result = await preference.create({ body: preferenceBody });
            return { preferenceId: result.id };
        } catch (error) {
            this.logger.error('Error al crear la preferencia de pago en Mercado Pago', error.cause?.message || error.message);
            throw new InternalServerErrorException('No se pudo generar el link de pago.');
        }
    }
}