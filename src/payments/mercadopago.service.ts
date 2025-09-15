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
        receiverList: any[] // ❌ CORRECCIÓN: Nuevo argumento para el split de pagos
    ) {
        if (!owner.mpAccessToken) {
            this.logger.error('[MercadoPagoService] ERROR CRÍTICO: La cuenta del dueño no tiene un Access Token de MP configurado.');
            throw new InternalServerErrorException("La cuenta del dueño para recibir pagos no está configurada.");
        }

        const mpClient = new MercadoPagoConfig({ accessToken: owner.mpAccessToken });
        const preferenceClient = new Preference(mpClient);

        // ❌ CORRECCIÓN: Se agrega la lógica para el split de pagos en el preference body
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
                id: receiver.id.toString(), // Convertir el id a string como lo requiere la API de MP
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