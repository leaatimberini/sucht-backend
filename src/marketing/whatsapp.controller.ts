
import { Controller, Get, Post, Body, Query, Res, HttpStatus, Logger, Req } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { Response, Request } from 'express';

@Controller('whatsapp')
export class WhatsappController {
    private readonly logger = new Logger(WhatsappController.name);

    constructor(private readonly whatsappService: WhatsappService) { }

    // Webhook Verification (Meta sends GET request)
    @Get('webhook')
    verifyWebhook(
        @Query('hub.mode') mode: string,
        @Query('hub.verify_token') token: string,
        @Query('hub.challenge') challenge: string,
        @Res() res: Response
    ) {
        try {
            const response = this.whatsappService.verifyWebhook(mode, token, challenge);
            return res.status(HttpStatus.OK).send(response);
        } catch (error) {
            this.logger.error('Webhook verification failed');
            return res.status(HttpStatus.FORBIDDEN).send();
        }
    }

    // Receive Incoming Messages (Meta sends POST request)
    @Post('webhook')
    async handleIncoming(@Body() body: any, @Res() res: Response) {
        // Return 200 OK immediately to acknowledge receipt
        res.status(HttpStatus.OK).send('EVENT_RECEIVED');

        // Process in background
        try {
            await this.whatsappService.handleIncomingMessage(body);
        } catch (error) {
            this.logger.error('Error handling incoming message', error);
        }
    }
}
