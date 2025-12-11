
import { Controller, Get, Post, Body, Query, Headers, HttpException, HttpStatus, Logger, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MarketingService } from './marketing.service';
import { createHmac } from 'crypto';

@Controller('marketing/webhooks')
export class WebhookController {
    private readonly logger = new Logger(WebhookController.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly marketingService: MarketingService
    ) { }

    @Get()
    verifyWebhook(
        @Query('hub.mode') mode: string,
        @Query('hub.verify_token') token: string,
        @Query('hub.challenge') challenge: string
    ) {
        const verifyToken = this.configService.get('META_VERIFY_TOKEN') || 'sucht_verify_token';

        if (mode === 'subscribe' && token === verifyToken) {
            this.logger.log('Webhook verified successfully');
            return challenge;
        }

        throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    @Post()
    async handleWebhook(
        @Body() body: any,
        @Headers('x-hub-signature-256') signature: string
    ) {
        // Validate Signature (Optional for now, but good practice)
        const appSecret = this.configService.get('META_APP_SECRET');
        if (appSecret && signature) {
            const expectedSignature = 'sha256=' + createHmac('sha256', appSecret)
                .update(JSON.stringify(body))
                .digest('hex');

            // if (signature !== expectedSignature) {
            //    throw new HttpException('Invalid Signature', HttpStatus.UNAUTHORIZED);
            // }
        }

        this.logger.log('Webhook Received:', JSON.stringify(body));

        // Async processing to respond quickly to Meta
        this.marketingService.handleWebhookEvent(body).catch(err => {
            this.logger.error('Error processing webhook:', err);
        });

        return { status: 'success' };
    }
}
