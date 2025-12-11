
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { User } from '../users/user.entity';

@Injectable()
export class CapiService {
    private readonly logger = new Logger(CapiService.name);
    private readonly apiUrl = 'https://graph.facebook.com/v17.0';

    constructor(
        private readonly configService: ConfigService,
        private readonly httpService: HttpService,
    ) { }

    private hashData(data: string | undefined | null): string | null {
        if (!data) return null;
        return crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex');
    }

    async sendPurchaseEvent(user: User, amount: number, currency: string, eventId: string, paymentId: string) {
        const pixelId = this.configService.get<string>('META_PIXEL_ID');
        const accessToken = this.configService.get<string>('META_CAPI_TOKEN');

        if (!pixelId || !accessToken) {
            this.logger.warn('Meta Pixel ID or CAPI Token not configured. Skipping CAPI event.');
            return;
        }

        const userData = {
            em: [this.hashData(user.email)],
            ph: user.whatsappNumber ? [this.hashData(user.whatsappNumber)] : undefined,
            fn: user.name ? [this.hashData(user.name.split(' ')[0])] : undefined, // First Name
            ln: user.name && user.name.split(' ').length > 1 ? [this.hashData(user.name.split(' ').slice(1).join(' '))] : undefined, // Last Name
            client_ip_address: null, // Hard to get from async webhook context
            client_user_agent: 'Sucht-Backend-Server' // Custom UA
        };

        const eventData = {
            data: [
                {
                    event_name: 'Purchase',
                    event_time: Math.floor(Date.now() / 1000),
                    action_source: 'website',
                    user_data: userData,
                    custom_data: {
                        currency: currency,
                        value: amount,
                        content_ids: [eventId],
                        content_type: 'product'
                    },
                    event_id: paymentId // Critical for deduplication with browser pixel
                }
            ]
        };

        try {
            this.logger.log(`[CAPI] Sending Purchase event for ${user.email}, Amount: ${amount}`);
            await firstValueFrom(
                this.httpService.post(
                    `${this.apiUrl}/${pixelId}/events?access_token=${accessToken}`,
                    eventData
                )
            );
            this.logger.log('[CAPI] Purchase event sent successfully.');
        } catch (error) {
            this.logger.error('[CAPI] Failed to send event:', error.response?.data || error.message);
        }
    }

    async sendInitiateCheckoutEvent(user: User, amount: number, currency: string, contentIds: string[]) {
        const pixelId = this.configService.get<string>('META_PIXEL_ID');
        const accessToken = this.configService.get<string>('META_CAPI_TOKEN');

        if (!pixelId || !accessToken) return;

        const userData = {
            em: [this.hashData(user.email)],
            ph: user.whatsappNumber ? [this.hashData(user.whatsappNumber)] : undefined,
            fn: user.name ? [this.hashData(user.name.split(' ')[0])] : undefined,
            client_user_agent: 'Sucht-Backend-Server'
        };

        const eventData = {
            data: [
                {
                    event_name: 'InitiateCheckout',
                    event_time: Math.floor(Date.now() / 1000),
                    action_source: 'website',
                    user_data: userData,
                    custom_data: {
                        currency: currency,
                        value: amount,
                        content_ids: contentIds,
                        content_type: 'product'
                    }
                }
            ]
        };

        try {
            await firstValueFrom(this.httpService.post(`${this.apiUrl}/${pixelId}/events?access_token=${accessToken}`, eventData));
        } catch (e) { /* Silent fail */ }
    }
}
