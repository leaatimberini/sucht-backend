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
        admin: User, // ❌ CORRECCIÓN: Se usa el usuario Admin para la preferencia
        items: any[],
        externalReference: string,
        backUrls: any,
        notificationUrl: string,
        receiverList: any[]
    ) {
        if (!admin.mpAccessToken) {
            this.logger.error('[MercadoPagoService] ERROR CRÍTICO: La cuenta del Admin no tiene un Access Token de MP configurado.');
            throw new InternalServerErrorException("La cuenta del admin para recibir pagos no está configurada.");
        }

        // ❌ CORRECCIÓN: Se usa el access token del ADMIN para configurar el cliente de Mercado Pago
        const mpClient = new MercadoPagoConfig({ accessToken: admin.mpAccessToken });
        const preferenceClient = new Preference(mpClient);

        const body: any = {
            items,
            back_urls: backUrls,
            notification_url: notificationUrl,
            auto_return: 'approved',
            external_reference: externalReference,
        };

        if (receiverList && receiverList.length > 0) {
            body.split_payment = true;
            body.receivers = receiverList.map(receiver => ({
                id: receiver.id.toString(),
                amount: receiver.amount,
            }));
        }

        const preference = await preferenceClient.create({
            body: body,
        });

        this.logger.log(`[MercadoPagoService] Preferencia de MP creada con ID: ${preference.id}`);
        return { preferenceId: preference.id, init_point: preference.init_point };
    }
}