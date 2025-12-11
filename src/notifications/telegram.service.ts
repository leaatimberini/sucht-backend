
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Context } from 'telegraf';
import { DashboardService } from 'src/dashboard/dashboard.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class TelegramService {
    private readonly logger = new Logger(TelegramService.name);
    private bot: Telegraf;
    private chatId: string;

    private actionHandlers: ((action: string, proposalId: string) => Promise<boolean>)[] = [];
    private messageHandlers: ((text: string, ctx: any) => Promise<boolean>)[] = [];

    constructor(
        private configService: ConfigService,
        private readonly dashboardService: DashboardService,
        @Inject(forwardRef(() => UsersService))
        private readonly usersService: UsersService,
    ) {
        this.logger.log('TelegramService: Instantiating...');
        const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
        const chatId = this.configService.get<string>('TELEGRAM_CHAT_ID');

        this.chatId = chatId || '';
        this.logger.log(`TelegramService: Token present: ${!!token}, ChatID present: ${!!chatId} (${chatId})`);

        if (token) {
            this.bot = new Telegraf(token);
            this.initializeBotListeners();
        } else {
            this.logger.warn('Telegram Bot Token missing. Notifications disabled.');
        }
    }

    private async initializeBotListeners() {
        this.logger.log('TelegramService: Initializing listeners...');

        try {
            const botInfo = await this.bot.telegram.getMe();
            this.logger.log(`TelegramService: Successfully connected to bot @${botInfo.username} (${botInfo.id})`);
        } catch (e) {
            this.logger.error('TelegramService: Failed to getMe() - Check Token or Connection', e);
            return;
        }

        // Eliminar webhook por si acaso (evita conflicto con polling)
        try {
            await this.bot.telegram.deleteWebhook();
            this.logger.log('TelegramService: Webhook deleted successfully.');
        } catch (e) {
            this.logger.warn('TelegramService: Failed to delete webhook (ignorable):', e);
        }

        // --- COMANDOS ---
        this.bot.start(async (ctx) => {
            const userName = ctx.from.first_name || 'Admin';
            await ctx.reply(`Hola ${userName} 👋\nBienvenido al Panel de Control de SUCHT Bot.\n\nElige una opción:`, {
                reply_markup: {
                    keyboard: [
                        [{ text: '📊 Estadísticas' }, { text: '👥 Partners Pendientes' }],
                        [{ text: '⭐ Reseñas Pendientes' }, { text: '❓ Ayuda' }]
                    ],
                    resize_keyboard: true
                }
            });
        });

        this.bot.command('broadcast', async (ctx) => {
            const message = ctx.message.text.split(' ').slice(1).join(' ');
            if (!message) {
                return ctx.reply('Uso: /broadcast [mensaje]');
            }
            // Aquí iría la lógica real de broadcast a todos los usuarios suscritos en DB
            // Por ahora, solo confirmamos la acción.
            await ctx.reply(`📢 Mensaje enviado (Simulación): "${message}"`);
            // TODO: Integrar con UsersService para obtener IDs reales de telegram si los almacenamos
            await this.sendNotification(`📢 BROADCAST ADMIN:\n${message}`);
        });

        this.bot.command('help', (ctx) => {
            ctx.reply('Comandos disponibles:\n/start - Menú Principal\n/broadcast [msg] - Enviar alerta global');
        });

        // --- MANEJO DE MENSAJES (Menú) ---
        this.bot.on('text', async (ctx) => {
            const text = ctx.message.text;

            // Check handlers first
            let handled = false;
            for (const handler of this.messageHandlers) {
                if (await handler(text, ctx)) {
                    handled = true;
                    break;
                }
            }
            if (handled) return;

            // Default Menu Logic
            switch (text) {
                case '📊 Estadísticas':
                    try {
                        const stats = await this.dashboardService.getSummaryMetrics({});
                        const msg = `📊 *Estadísticas Globales*\n\n` +
                            `🎫 Tickets Emitidos: *${stats.totalTicketsGenerated}*\n` +
                            `👥 Ingresos Totales: *${stats.totalPeopleAdmitted}*\n` +
                            `👑 VIP Emitidos: *${stats.totalVIPTicketsGenerated}*\n` +
                            `🥂 VIP Ingresos: *${stats.totalVIPPeopleAdmitted}*\n` +
                            `🎉 Total Eventos: *${stats.totalEvents}*`;
                        ctx.replyWithMarkdown(msg);
                    } catch (e) {
                        this.logger.error('Error fetching stats', e);
                        ctx.reply('⚠️ Error obteniendo estadísticas.');
                    }
                    break;

                case '⭐ Reseñas Pendientes':
                    try {
                        // Importante: status 'PENDING_VALIDATION' es lo que buscamos
                        // Necesitamos importar GoogleReviewStatus o usar el string 'pending_validation' si coincide
                        // Usaremos el string hardcodeado 'pending_validation' si el enum no está exportado aqui, 
                        // pero mejor importamos UsersService y usamos su metodo
                        // En UsersService: findGoogleReviewRequests(status)
                        // Vamos a asumir 'pending_validation' como string o importar el Enum si es posible.
                        // Usaremos 'PENDING_VALIDATION' as any
                        const reviews = await this.usersService.findGoogleReviewRequests('PENDING_VALIDATION' as any);

                        if (reviews.length === 0) {
                            ctx.reply('✅ No hay reseñas pendientes de validación.');
                        } else {
                            ctx.reply(`⭐ Se encontraron ${reviews.length} reseñas pendientes:`);
                            for (const user of reviews) {
                                const message = `👤 *Reseña Pendiente*\nUsuario: ${user.name}\nEmail: ${user.email}\nID: \`${user.id}\`\n\n¿Validar reseña en Maps?`;
                                await ctx.replyWithMarkdown(message, {
                                    reply_markup: {
                                        inline_keyboard: [
                                            [
                                                { text: '✅ APROBAR', callback_data: `approve_review_${user.id}` },
                                                { text: '❌ RECHAZAR', callback_data: `reject_review_${user.id}` }
                                            ]
                                        ]
                                    }
                                });
                            }
                        }
                    } catch (e) {
                        this.logger.error('Error fetching reviews', e);
                        ctx.reply('⚠️ Error buscando reseñas pendientes.');
                    }
                    break;

                case '❓ Ayuda':
                    ctx.reply('Panel de Administración SUCHT.\nUsa los botones para navegar o escribe comandos directos.');
                    break;
                default:
                // No respondemos a todo para no ser molestos, solo log
                // ctx.reply('Comando no reconocido.'); 
            }
        });

        // --- ACCIONES (Botones Inline) ---
        this.bot.action(/^(approve|reject)(_review)?(_partner)?_(.+)$/, async (ctx) => {
            const actionType = ctx.match[1]; // approve o reject
            const suffix = ctx.match[2] || ctx.match[3] || ''; // _review, _partner, etc
            const proposalId = ctx.match[4]; // ID

            // Construir fullAction correctamente: approve_review, approve_partner, o approve
            const fullAction = `${actionType}${suffix}`;

            await ctx.answerCbQuery(`Processing ${fullAction}...`);

            let handled = false;
            for (const handler of this.actionHandlers) {
                try {
                    const result = await handler(fullAction, proposalId);
                    if (result) handled = true;
                } catch (e) {
                    this.logger.error(`Handler error for ${fullAction}:`, e);
                }
            }

            if (handled) {
                const message = ctx.callbackQuery.message;
                const messageText = (message && 'text' in message) ? message.text : 'Solicitud';
                // Solo editamos si se manejó, para evitar conflictos
                try {
                    await ctx.editMessageText(
                        `${messageText}\n\n` +
                        (actionType === 'approve' ? '✅ APROBADO' : '❌ RECHAZADO')
                    );
                } catch (e) {
                    // Ignorar si el mensaje ya no se puede editar
                }
            } else {
                await ctx.reply(`⚠️ No handler found for action: ${fullAction}`);
            }
        });

        this.bot.launch({ dropPendingUpdates: true })
            .then(() => this.logger.log(`TelegramService: Bot launched successfully at ${new Date().toISOString()}! 🚀`))
            .catch(err => this.logger.error('TelegramService: Bot launch failed:', err));

        // Graceful stop
        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    }

    registerActionHandler(handler: (action: string, proposalId: string) => Promise<boolean>) {
        this.actionHandlers.push(handler);
    }

    registerMessageHandler(handler: (text: string, ctx: any) => Promise<boolean>) {
        this.messageHandlers.push(handler);
    }

    registerCommand(command: string, handler: (ctx: any) => Promise<void>) {
        if (this.bot) {
            this.bot.command(command, handler);
        }
    }

    async sendNotification(message: string) {
        if (!this.bot || !this.chatId) {
            this.logger.warn('Cannot send Telegram message: Bot or ChatID missing.');
            return;
        }

        try {
            await this.bot.telegram.sendMessage(this.chatId, message, { parse_mode: 'Markdown' });
        } catch (error) {
            this.logger.error(`Failed to send Telegram message: ${error.message}`);
        }
    }

    async sendProposal(title: string, details: string, proposalId: string) {
        if (!this.bot || !this.chatId) return;

        const message = `🧠 *Propuesta de Cerebro AI*\n\n*${title}*\n${details}`;

        try {
            await this.bot.telegram.sendMessage(this.chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '✅ APROBAR', callback_data: `approve_${proposalId}` },
                            { text: '❌ RECHAZAR', callback_data: `reject_${proposalId}` }
                        ]
                    ]
                }
            });
        } catch (error) {
            this.logger.error(`Failed to send proposal: ${error.message}`);
        }
    }

    async sendReviewValidationRequest(userName: string, userEmail: string, userId: string) {
        if (!this.bot || !this.chatId) {
            this.logger.warn('Telegram notifications disabled (missing token/chatId)');
            return;
        }

        const message = `🌟 *Nueva Reseña de Google por Validar*\n\nUsuario: *${userName}*\nEmail: ${userEmail}\nID: \`${userId}\`\n\nEl usuario indica que ha dejado una reseña. Verifica en Maps.`;

        try {
            await this.bot.telegram.sendMessage(this.chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '✅ APROBAR RESEÑA', callback_data: `approve_review_${userId}` },
                            { text: '❌ RECHAZAR', callback_data: `reject_review_${userId}` }
                        ]
                    ]
                }
            });
        } catch (error) {
            this.logger.error(`Failed to send review validation: ${error.message}`);
        }
    }

    async sendPendingPartnersList(partners: any[]) {
        if (!this.bot || !this.chatId) return;

        if (partners.length === 0) {
            await this.sendNotification('👥 No hay solicitudes de partners pendientes.');
            return;
        }

        await this.sendNotification(`👥 *Solicitudes de Partners Pendientes (${partners.length})*`);

        for (const partner of partners) {
            const message = `🏪 *Solicitud de Partner*\n\nNombre: *${partner.name}*\nUsuario: ${partner.user?.email}\nID: \`${partner.id}\``;
            await this.bot.telegram.sendMessage(this.chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '✅ APROBAR', callback_data: `approve_partner_${partner.id}` },
                            { text: '❌ RECHAZAR', callback_data: `reject_partner_${partner.id}` }
                        ]
                    ]
                }
            });
        }
    }
}
