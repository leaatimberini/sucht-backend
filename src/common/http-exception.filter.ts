import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const status = exception.getStatus();
        const exceptionResponse = exception.getResponse();

        this.logger.error(
            `HTTP Error: ${status} Method: ${request.method} URL: ${request.url}`,
            JSON.stringify(exceptionResponse, null, 2),
        );

        if (request.method === 'PATCH' || request.method === 'POST') {
            this.logger.error('Body:', JSON.stringify(request.body, null, 2));
        }

        response
            .status(status)
            .json(exceptionResponse);
    }
}
