import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { TicketsService } from '../tickets/tickets.service';
import { StoreService } from '../store/store.service';
import { User, UserRole } from '../users/user.entity';
import { Ticket } from 'src/tickets/ticket.entity';
import { ProductPurchase } from 'src/store/product-purchase.entity';

// Interfaz para la respuesta enriquecida
export interface ScanResult {
    type: 'ticket' | 'product';
    isValid: boolean;
    message: string;
    details: any;
}

@Injectable()
export class VerifierService {
  private readonly logger = new Logger(VerifierService.name);

  constructor(
    private readonly ticketsService: TicketsService,
    private readonly storeService: StoreService,
  ) {}

  async scanQr(qrId: string, user: User): Promise<ScanResult> {
    this.logger.log(`Usuario ${user.email} (Roles: ${user.roles}) está escaneando el QR ID: ${qrId}`);

    // Primero, intentamos encontrarlo como un Ticket
    try {
      const ticket = await this.ticketsService.findOne(qrId);
      if (ticket) {
        this.logger.log(`QR ${qrId} identificado como Ticket.`);
        
        // Es un Ticket. Verificamos si el usuario tiene permiso para escanearlo.
        if (!user.roles.includes(UserRole.VERIFIER) && !user.roles.includes(UserRole.ADMIN)) {
            this.logger.warn(`Permiso denegado: Usuario ${user.email} intentó escanear un ticket.`);
            throw new ForbiddenException('No tienes permiso para validar entradas.');
        }
        
        // Intentamos canjear el ticket. El método redeemTicket ya maneja errores (ej. ya canjeado).
        const redemptionResult = await this.ticketsService.redeemTicket(qrId, 1); // Asumimos que se canjea 1 por escaneo
        
        this.logger.log(`Ticket ${qrId} canjeado exitosamente.`);
        return {
            type: 'ticket',
            isValid: true,
            message: redemptionResult.message,
            details: {
                clientName: ticket.user.name,
                ticketType: ticket.tier.name,
                isVip: ticket.isVipAccess,
                origin: ticket.origin,
                promoterName: ticket.promoter?.name || null,
                specialInstructions: ticket.specialInstructions,
            }
        };
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        // No es un ticket, lo ignoramos y continuamos para ver si es un producto.
        this.logger.log(`QR ${qrId} no es un ticket, continuando búsqueda...`);
      } else {
        // Si es otro tipo de error (ej. ya canjeado, evento finalizado), lo lanzamos.
        this.logger.error(`Error al canjear ticket ${qrId}: ${error.message}`);
        throw error;
      }
    }

    // Si no es un Ticket, intentamos encontrarlo como un ProductPurchase
    try {
        const productPurchase = await this.storeService.findPurchaseById(qrId);
        if(productPurchase) {
            this.logger.log(`QR ${qrId} identificado como ProductPurchase.`);

            // Es un Producto. Verificamos si el usuario tiene permiso.
            if (!user.roles.includes(UserRole.BARRA) && !user.roles.includes(UserRole.ADMIN)) {
                this.logger.warn(`Permiso denegado: Usuario ${user.email} intentó escanear un producto.`);
                throw new ForbiddenException('No tienes permiso para validar productos o regalos.');
            }

            // Intentamos validar la compra. El método validatePurchase ya maneja errores.
            await this.storeService.validatePurchase(qrId);
            
            this.logger.log(`Producto ${qrId} validado exitosamente.`);
            return {
                type: 'product',
                isValid: true,
                message: 'Producto canjeado con éxito.',
                details: {
                    clientName: productPurchase.user.name,
                    productName: productPurchase.product.name,
                }
            };
        }
    } catch (error) {
        if (error instanceof NotFoundException) {
            // No es un producto, por lo que no existe en ninguna tabla.
        } else {
            // Si es otro tipo de error (ej. ya canjeado), lo lanzamos.
            this.logger.error(`Error al validar producto ${qrId}: ${error.message}`);
            throw error;
        }
    }
    
    // Si no se encontró en ninguna de las dos tablas
    this.logger.error(`El código QR ${qrId} no fue encontrado en ninguna tabla.`);
    throw new NotFoundException('El código QR no es válido o no fue encontrado.');
  }
}