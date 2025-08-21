import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { TicketsService } from '../tickets/tickets.service';
import { StoreService } from '../store/store.service';
import { User, UserRole } from '../users/user.entity';

// Definimos una interfaz para la respuesta enriquecida
export interface ScanResult {
    type: 'ticket' | 'product';
    isValid: boolean;
    message: string;
    details: any;
}

@Injectable()
export class VerifierService {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly storeService: StoreService,
  ) {}

  async scanQr(qrId: string, user: User): Promise<ScanResult> {
    // Primero, intentamos encontrarlo como un Ticket
    try {
      const ticket = await this.ticketsService.findOne(qrId);
      if (ticket) {
        // Es un Ticket. Verificamos si el usuario tiene permiso para escanearlo.
        if (!user.roles.includes(UserRole.VERIFIER) && !user.roles.includes(UserRole.ADMIN)) {
            throw new ForbiddenException('No tienes permiso para validar entradas.');
        }
        // Construimos la respuesta enriquecida para el ticket
        return {
            type: 'ticket',
            isValid: true,
            message: 'Entrada encontrada.',
            details: {
                clientName: ticket.user.name,
                ticketType: ticket.tier.name,
                isVip: ticket.isVipAccess,
                origin: ticket.origin,
                promoterName: ticket.promoter?.name || null,
                specialInstructions: ticket.specialInstructions,
                // Añadimos aquí la lógica para mesas si es necesario
            }
        };
      }
    } catch (error) {
      // No es un ticket, lo ignoramos y continuamos
    }

    // Si no es un Ticket, intentamos encontrarlo como un ProductPurchase
    try {
        const productPurchase = await this.storeService.findPurchaseById(qrId);
        if(productPurchase) {
            // Es un Producto. Verificamos si el usuario tiene permiso.
            if (!user.roles.includes(UserRole.BARRA) && !user.roles.includes(UserRole.ADMIN)) {
                throw new ForbiddenException('No tienes permiso para validar productos o regalos.');
            }
            // Construimos la respuesta enriquecida para el producto
            return {
                type: 'product',
                isValid: !productPurchase.redeemedAt,
                message: productPurchase.redeemedAt ? 'Este producto ya fue canjeado.' : 'Producto válido.',
                details: {
                    clientName: productPurchase.user.name,
                    productName: productPurchase.product.name,
                    redeemedAt: productPurchase.redeemedAt
                }
            };
        }
    } catch (error) {
        // No es un producto, lo ignoramos y continuamos
    }
    
    // Si no se encontró en ninguna de las dos tablas
    throw new NotFoundException('El código QR no es válido o no fue encontrado.');
  }
}