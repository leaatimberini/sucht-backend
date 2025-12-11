
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WhatsappService {
    private readonly logger = new Logger(WhatsappService.name);
    private readonly apiUrl = 'https://graph.facebook.com/v17.0';

    constructor(
        private readonly configService: ConfigService,
        private readonly httpService: HttpService,
    ) { }

    // 1. Verify Webhook Token
    verifyWebhook(mode: string, token: string, challenge: string): string {
        const verifyToken = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN');
        if (mode === 'subscribe' && token === verifyToken) {
            this.logger.log('Webhook verified successfully');
            return challenge;
        }
        throw new Error('Invalid verification token');
    }

    // 2. Handle Incoming Messages
    async handleIncomingMessage(body: any) {
        this.logger.debug('Received WhatsApp Webhook:', JSON.stringify(body));

        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        if (message) {
            const senderId = message.from; // User's phone number
            const messageType = message.type;

            // Mark as read immediately (Good practice)
            await this.markMessageAsRead(message.id);

            // AUTO-REPLY LOGIC (Service Bot)
            if (messageType === 'text') {
                const text = message.text.body;
                this.logger.log(`Received text from ${senderId}: ${text}`);

                // Determine response
                await this.sendWelcomeMenu(senderId);
            } else if (messageType === 'interactive') {
                const interaction = message.interactive;
                this.logger.log(`Received interaction from ${senderId}: ${JSON.stringify(interaction)}`);
                // Handle button clicks / list selections here
                await this.handleInteraction(senderId, interaction);
            }
        }
    }

    // 3. Send Welcome Menu (Interactive List)
    async sendWelcomeMenu(to: string) {
        const payload = {
            messaging_product: 'whatsapp',
            to: to,
            type: 'interactive',
            interactive: {
                type: 'list',
                header: {
                    type: 'text',
                    text: '¡Hola! Bienvenido a Sucht 🌙'
                },
                body: {
                    text: 'Soy tu asistente virtual. ¿En qué te puedo ayudar hoy?'
                },
                footer: {
                    text: 'Selecciona una opción 👇'
                },
                action: {
                    button: 'Ver Opciones',
                    sections: [
                        {
                            title: 'Eventos y Tickets',
                            rows: [
                                { id: 'events_list', title: '📅 Próximos Eventos', description: 'Ver agenda y comprar' },
                                { id: 'my_qr', title: '🎟️ Mis Entradas', description: 'Recuperar mi código QR' }
                            ]
                        },
                        {
                            title: 'Ayuda',
                            rows: [
                                { id: 'contact_human', title: '💬 Hablar con Humano', description: 'Atención personalizada' }
                            ]
                        }
                    ]
                }
            }
        };
        await this.sendMessage(payload);
    }

    async handleInteraction(to: string, interaction: any) {
        let responseText = "Opción no válida";

        if (interaction.type === 'list_reply') {
            const id = interaction.list_reply.id;

            switch (id) {
                case 'events_list':
                    responseText = "Aquí tienes nuestros próximos eventos: [Enlace a eventos]";
                    // TODO: Could fetch real events from EventsService
                    break;
                case 'my_qr':
                    responseText = "Para ver tus entradas, ingresa a: https://sucht.com.ar/mi-cuenta";
                    break;
                case 'contact_human':
                    responseText = "Un asesor se pondrá en contacto contigo en breve. ⏳";
                    break;
            }
        }

        await this.sendText(to, responseText);
    }

    // Generic Send Method
    async sendMessage(payload: any) {
        const token = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
        const phoneId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');

        try {
            await firstValueFrom(
                this.httpService.post(
                    `${this.apiUrl}/${phoneId}/messages`,
                    payload,
                    { headers: { Authorization: `Bearer ${token}` } }
                )
            );
        } catch (error) {
            this.logger.error('Error sending WhatsApp message', error.response?.data || error.message);
        }
    }

    async sendText(to: string, text: string) {
        await this.sendMessage({
            messaging_product: 'whatsapp',
            to: to,
            type: 'text',
            text: { body: text }
        });
    }

    async markMessageAsRead(messageId: string) {
        const token = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
        const phoneId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');

        try {
            await firstValueFrom(
                this.httpService.post(
                    `${this.apiUrl}/${phoneId}/messages`,
                    { messaging_product: 'whatsapp', status: 'read', message_id: messageId },
                    { headers: { Authorization: `Bearer ${token}` } }
                )
            );
        } catch (error) {
            // Silently fail is okay for read receipts
        }
    }
}
