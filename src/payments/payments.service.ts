import {
    BadRequestException,
    Injectable,
    NotFoundException,
    InternalServerErrorException,
    Logger,
    forwardRef,
    Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { TicketsService } from 'src/tickets/tickets.service';
import { UsersService } from 'src/users/users.service';
import { User } from 'src/users/user.entity';
import { TicketTiersService } from 'src/ticket-tiers/ticket-tiers.service';
import { AcquireTicketDto } from 'src/tickets/dto/acquire-ticket.dto';
import { ConfigurationService } from 'src/configuration/configuration.service';
import axios from 'axios';
import { StoreService } from 'src/store/store.service';
import { TaloService } from './talo.service';
import { MercadoPagoService } from './mercadopago.service';

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
        @Inject(forwardRef(() => TicketsService))
        private readonly ticketsService: TicketsService,
        private readonly ticketTiersService: TicketTiersService,
        private readonly configurationService: ConfigurationService,
        private readonly storeService: StoreService,
        private readonly taloService: TaloService,
        private readonly mercadoPagoService: MercadoPagoService,
    ) {}

    async createPreference(
        buyer: User,
        data: AcquireTicketDto & {
            promoterUsername?: string;
            paymentMethod?: 'mercadopago' | 'talo';
        },
    ) {
        this.logger.log(
            `[createPreference] Iniciando para comprador: ${buyer.email} | Tier: ${data.ticketTierId}`,
        );

        const {
            eventId,
            ticketTierId,
            quantity,
            promoterUsername,
            paymentType = 'full',
            paymentMethod = 'mercadopago',
        } = data;

        const tier = await this.ticketTiersService.findOne(ticketTierId);
        if (!tier) throw new NotFoundException('Tipo de entrada no encontrado.');
        if (tier.quantity < quantity)
            throw new BadRequestException('No quedan suficientes entradas.');

        const paymentsEnabled = await this.configurationService.get(
            'paymentsEnabled',
        );
        if (tier.isFree || paymentsEnabled !== 'true') {
            this.logger.log(
                `[createPreference] Tier es gratuito o pagos desactivados. Creando ticket sin costo.`,
            );
            const ticket = await this.ticketsService.acquireForClient(
                buyer,
                data,
                promoterUsername ?? null,
                0,
                null,
            );
            return {
                type: 'free',
                ticketId: ticket.id,
                message: 'Producto adquirido con éxito.',
            };
        }

        let amountToPay: number;
        if (
            paymentType === 'partial' &&
            tier.allowPartialPayment &&
            tier.partialPaymentPrice
        ) {
            amountToPay = Number(tier.partialPaymentPrice) * quantity;
        } else {
            amountToPay = Number(tier.price) * quantity;
        }

        // ❌ CORRECCIÓN: Ahora buscamos el ADMIN para la preferencia, no el OWNER.
        const paymentAdmin = await this.usersService.findAdminForPayments();
        if (!paymentAdmin) {
            throw new InternalServerErrorException(
                'La cuenta de Admin para recibir pagos no está configurada.',
            );
        }

        const externalReference = JSON.stringify({
            type: 'TICKET_PURCHASE',
            buyerId: buyer.id,
            eventId,
            ticketTierId,
            quantity,
            promoterUsername,
            amountPaid: amountToPay,
            paymentType,
        });

        const backUrls = {
            success: `${
                await this.configurationService.get('FRONTEND_URL')
            }/payment/success`,
            failure: `${
                await this.configurationService.get('FRONTEND_URL')
            }/payment/failure`,
        };
        const notificationUrl = `${await this.configurationService.get(
            'BACKEND_URL',
        )}/payments/webhook`;

        const items = [
            {
                id: tier.id,
                title: `${tier.name} x ${quantity}`,
                quantity: 1,
                unit_price: amountToPay,
                currency_id: 'ARS',
            },
        ];

        // --- 🔑 INTEGRACIÓN CON TALO ---
        if (paymentMethod === 'talo') {
            const ownerAccount = await this.usersService.findOwnerForPayments();
            const adminFeePercentage = parseFloat((await this.configurationService.get('adminServiceFeePercentage')) || '0');

            if (!paymentAdmin?.cbu) {
                throw new InternalServerErrorException('La cuenta de Admin no tiene CBU/CVU configurado.');
            }
            if (!ownerAccount?.cbu) {
                throw new InternalServerErrorException('La cuenta de Dueño no tiene CBU/CVU configurado.');
            }

            const adminFee = Math.round(amountToPay * (adminFeePercentage / 100));
            let ownerAmount = amountToPay - adminFee;

            const split_receivers: { cbu_cvu: string; amount: number }[] = [
                { cbu_cvu: ownerAccount.cbu, amount: 0 },
                { cbu_cvu: paymentAdmin.cbu, amount: adminFee },
            ];

            const rrppCommissionEnabled = await this.configurationService.get('rrppCommissionEnabled');
            if (promoterUsername && rrppCommissionEnabled === 'true') {
                const promoter = await this.usersService.findOneByUsername(promoterUsername);
                if (promoter?.cbu && promoter.rrppCommissionRate) {
                    const promoterFee = Math.round(amountToPay * (promoter.rrppCommissionRate / 100));
                    split_receivers.push({ cbu_cvu: promoter.cbu, amount: promoterFee });
                    ownerAmount -= promoterFee;
                }
            }
            split_receivers[0].amount = ownerAmount;

            if (!ownerAccount.taloAccessToken) {
                throw new InternalServerErrorException('El Dueño receptor de pagos no ha vinculado su cuenta de Talo.');
            }
            return this.taloService.createPreference(ownerAccount.taloAccessToken, {
                amount: amountToPay,
                description: `Entrada: ${tier.name} para ${tier.event.title}`,
                external_reference: externalReference,
                split_receivers,
            });
        }

        // --- MERCADO PAGO ---
        const ownerAccount = await this.usersService.findOwnerForPayments();
        if (!ownerAccount?.mpUserId) {
            throw new InternalServerErrorException('La cuenta del dueño para pagos no está configurada.');
        }

        let adminFee = amountToPay;
        const receiverList: any[] = [];
        const adminFeePercentage = parseFloat((await this.configurationService.get('adminServiceFeePercentage')) || '0');
        adminFee = Math.round(amountToPay * (adminFeePercentage / 100));

        let promoterFee = 0;
        const rrppCommissionEnabled = await this.configurationService.get('rrppCommissionEnabled');
        if (promoterUsername && rrppCommissionEnabled === 'true') {
            const promoter = await this.usersService.findOneByUsername(promoterUsername);
            if (promoter?.mpUserId && promoter.rrppCommissionRate) {
                promoterFee = Math.round(amountToPay * (promoter.rrppCommissionRate / 100));
            }
        }
        
        const ownerAmount = amountToPay - adminFee - promoterFee;

        if (paymentAdmin?.mpUserId) {
            receiverList.push({ id: paymentAdmin.mpUserId, amount: adminFee });
        }
        if (promoterUsername && promoterFee > 0) {
            const promoter = await this.usersService.findOneByUsername(promoterUsername);
            if (promoter?.mpUserId) {
                receiverList.push({ id: promoter.mpUserId, amount: promoterFee });
            }
        }
        if (ownerAccount.mpUserId) {
            receiverList.push({ id: ownerAccount.mpUserId, amount: ownerAmount });
        }

        // ❌ CORRECCIÓN: Se pasa el Admin como 'owner' para la preferencia de MP
        return this.mercadoPagoService.createPreference(
            buyer,
            paymentAdmin,
            items,
            externalReference,
            backUrls,
            notificationUrl,
            receiverList
        );
    }

    private async processApprovedPayment(paymentId: string) {
        this.logger.log(
            `[processApprovedPayment] Iniciando para paymentId: ${paymentId}`,
        );

        // ❌ CORRECCIÓN: Se busca el admin para obtener el token, ya que es el que gestiona la preferencia.
        const admin = await this.usersService.findAdminForPayments();
        if (!admin?.mpAccessToken) {
            throw new InternalServerErrorException(
                'La cuenta del admin para gestionar pagos no está configurada.',
            );
        }

        const mpClient = new MercadoPagoConfig({ accessToken: admin.mpAccessToken });
        const payment = new Payment(mpClient);
        const paymentInfo = await payment.get({ id: paymentId });

        if (paymentInfo.status !== 'approved') {
            throw new BadRequestException(
                `El pago no ha sido aprobado. Estado actual: ${paymentInfo.status}`,
            );
        }

        const externalReference = paymentInfo.external_reference;
        if (!externalReference) {
            throw new InternalServerErrorException(
                'El pago no contiene la información necesaria (external_reference).',
            );
        }

        const data = JSON.parse(externalReference as string);
        const buyer = await this.usersService.findOneById(data.buyerId);
        if (!buyer) {
            throw new NotFoundException('Comprador no encontrado.');
        }

        if (data.type === 'PRODUCT_PURCHASE') {
            const existingProduct = await this.storeService.findPurchaseByPaymentId(
                paymentId,
            );
            if (existingProduct) {
                this.logger.warn(
                    `[Idempotencia] El pago ${paymentId} ya fue procesado para un PRODUCTO.`,
                );
                return { type: 'product', data: existingProduct };
            }
            this.logger.log(`Procesando pago de PRODUCTO para ${paymentId}`);
            const purchases = await this.storeService.finalizePurchase({
                ...data,
                paymentId,
            });
            return { type: 'product', data: purchases };
        } else {
            const existingTicket = await this.ticketsService.findOneByPaymentId(
                paymentId,
            );
            if (existingTicket) {
                this.logger.warn(
                    `[Idempotencia] El pago ${paymentId} ya fue procesado para un TICKET.`,
                );
                return { type: 'ticket', data: existingTicket };
            }
            this.logger.log(`Procesando pago de TICKET para ${paymentId}`);
            const ticket = await this.ticketsService.acquireForClient(
                buyer,
                data,
                data.promoterUsername,
                data.amountPaid,
                paymentId,
            );
            return { type: 'ticket', data: ticket };
        }
    }

    public async finalizePurchase(paymentId: string, user: User) {
        this.logger.log(
            `[finalizePurchase] El usuario ${user.email} solicita finalizar la compra para el pago ${paymentId}`,
        );
        const result = await this.processApprovedPayment(paymentId);
        return {
            message: 'Pago verificado y producto obtenido exitosamente.',
            ...result,
        };
    }

    public async handleWebhook(paymentData: { id: string }) {
        const paymentId = String(paymentData.id);
        this.logger.log(
            `[handleWebhook] Webhook recibido para paymentId: ${paymentId}`,
        );
        try {
            await this.processApprovedPayment(paymentId);
            this.logger.log(
                `[handleWebhook] Webhook para paymentId: ${paymentId} procesado con éxito.`,
            );
        } catch (error) {
            this.logger.error(
                `Error procesando webhook para paymentId: ${paymentId}`,
                error,
            );
        }
    }

    // --- MERCADO PAGO AUTH ---
    getMercadoPagoAuthUrl(userId: string): string {
        const clientId = this.configService.get('MP_CLIENT_ID');
        const redirectUri = this.configService.get('MP_REDIRECT_URI');
        const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
        return `https://auth.mercadopago.com.ar/authorization?client_id=${clientId}&response_type=code&platform_id=mp&redirect_uri=${redirectUri}&state=${state}`;
    }

    // --- TALO AUTH ---
    getTaloAuthUrl(userId: string): { authUrl: string } {
        return this.taloService.getTaloAuthUrl(userId);
    }

    async exchangeCodeForAccessToken(state: string, code: string): Promise<void> {
        let userId: string;
        try {
            const decodedState = JSON.parse(
                Buffer.from(state, 'base64').toString('ascii'),
            );
            userId = decodedState.userId;
            if (!userId) throw new Error('User ID no encontrado en el state');
        } catch (error) {
            throw new InternalServerErrorException(
                'Parámetro de estado inválido o malformado.',
            );
        }

        const clientId = this.configService.get('MP_CLIENT_ID');
        const clientSecret = this.configService.get('MP_CLIENT_SECRET');
        const redirectUri = this.configService.get('MP_REDIRECT_URI');

        try {
            const response = await axios.post(
                'https://api.mercadopago.com/oauth/token',
                {
                    client_id: clientId,
                    client_secret: clientSecret,
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: redirectUri,
                },
            );
            const { access_token, user_id } = response.data;
            await this.usersService.updateMercadoPagoCredentials(
                userId,
                access_token,
                user_id,
            );
            this.logger.log(
                `[exchangeCodeForAccessToken] Credenciales de MP actualizadas para el usuario ID: ${userId}`,
            );
        } catch (error) {
            this.logger.error(
                'Error intercambiando el código por el access token:',
                error.response?.data,
            );
            throw new InternalServerErrorException(
                'Error al vincular la cuenta de Mercado Pago.',
            );
        }
    }
}