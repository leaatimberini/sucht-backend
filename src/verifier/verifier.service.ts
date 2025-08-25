import { Injectable, NotFoundException, ForbiddenException, Logger, BadRequestException } from '@nestjs/common';
import { TicketsService } from '../tickets/tickets.service';
import { StoreService } from '../store/store.service';
import { User, UserRole } from '../users/user.entity';
import { RewardsService } from '../rewards/rewards.service';
import { Ticket } from 'src/tickets/ticket.entity';
import { ProductPurchase } from 'src/store/product-purchase.entity';

// Interfaz para la respuesta enriquecida
export interface ScanResult {
    type: 'ticket' | 'product' | 'reward';
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
    private readonly rewardsService: RewardsService,
  ) {}

  async scanQr(qrId: string, user: User): Promise<ScanResult> {
    this.logger.log(`Usuario ${user.email} (Roles: ${user.roles}) está escaneando el QR ID: ${qrId}`);

    // --- 1. Intenta encontrarlo como un Ticket ---
    try {
      const ticket = await this.ticketsService.findOne(qrId);
      if (ticket) {
        this.logger.log(`QR ${qrId} identificado como Ticket.`);
        if (!user.roles.includes(UserRole.VERIFIER) && !user.roles.includes(UserRole.ADMIN)) {
            this.logger.warn(`Permiso denegado: Usuario ${user.email} intentó escanear un ticket.`);
            throw new ForbiddenException('No tienes permiso para validar entradas.');
        }

        // Solo verificamos, no canjeamos. El canje se hará en otro endpoint.
        const remaining = ticket.quantity - ticket.redeemedCount;
        if (remaining <= 0) {
            throw new BadRequestException('Esta entrada ya ha sido utilizada por completo.');
        }

        return {
            type: 'ticket',
            isValid: true,
            message: 'Ticket válido encontrado.',
            details: ticket, // Devolvemos el objeto de ticket completo
        };
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.log(`QR ${qrId} no es un ticket, continuando búsqueda...`);
      } else {
        this.logger.error(`Error al verificar ticket ${qrId}: ${error.message}`);
        throw error;
      }
    }

    // --- 2. Intenta encontrarlo como un ProductPurchase ---
    try {
        const productPurchase = await this.storeService.findPurchaseById(qrId);
        if(productPurchase) {
            this.logger.log(`QR ${qrId} identificado como ProductPurchase.`);
            if (!user.roles.includes(UserRole.BARRA) && !user.roles.includes(UserRole.ADMIN)) {
                this.logger.warn(`Permiso denegado: Usuario ${user.email} intentó escanear un producto.`);
                throw new ForbiddenException('No tienes permiso para validar productos o regalos.');
            }

            if (productPurchase.redeemedAt) {
                throw new BadRequestException('Este producto ya fue canjeado.');
            }

            // Lógica de auto-validación de entrada
            await this.autoRedeemEntryTicket(productPurchase.user.id, productPurchase.eventId);

            const validationResult = await this.storeService.validatePurchase(qrId);
            
            this.logger.log(`Producto ${qrId} validado exitosamente.`);
            return {
                type: 'product',
                isValid: true,
                message: validationResult.message,
                details: {
                    clientName: validationResult.userName,
                    productName: validationResult.productName,
                    redeemedAt: validationResult.redeemedAt,
                }
            };
        }
    } catch (error) {
        if (error instanceof NotFoundException) {
            this.logger.log(`QR ${qrId} no es un producto, continuando búsqueda...`);
        } else {
            this.logger.error(`Error al validar producto ${qrId}: ${error.message}`);
            throw error;
        }
    }
    
    // --- 3. Intenta encontrarlo como un UserReward ---
    try {
        const userReward = await this.rewardsService.findUserRewardById(qrId);
        if (userReward) {
            this.logger.log(`QR ${qrId} identificado como UserReward.`);
            if (!user.roles.includes(UserRole.BARRA) && !user.roles.includes(UserRole.ADMIN)) {
                throw new ForbiddenException('No tienes permiso para validar premios.');
            }

            if (userReward.redeemedAt) {
                throw new BadRequestException('Este premio ya fue canjeado.');
            }
            
            const validationResult = await this.rewardsService.validateUserReward(qrId);

            return {
                type: 'reward',
                isValid: true,
                message: validationResult.message,
                details: {
                    clientName: validationResult.userName,
                    productName: validationResult.rewardName,
                    redeemedAt: validationResult.redeemedAt,
                },
            };
        }
    } catch (error) {
        if (!(error instanceof NotFoundException)) {
            this.logger.error(`Error al validar premio ${qrId}: ${error.message}`);
            throw error;
        }
    }
    
    this.logger.error(`El código QR ${qrId} no fue encontrado en ninguna tabla.`);
    throw new NotFoundException('El código QR no es válido o no fue encontrado.');
  }

  private async autoRedeemEntryTicket(userId: string, eventId: string) {
    try {
        const tickets = await this.ticketsService.findTicketsByUser(userId);
        const entryTicket = tickets.find(t => t.event.id === eventId && t.tier.productType === 'ticket');

        if (entryTicket && entryTicket.redeemedCount === 0) {
            this.logger.log(`Auto-validando ticket de ingreso ${entryTicket.id} para usuario ${userId}`);
            await this.ticketsService.redeemTicket(entryTicket.id, 1);
        }
    } catch (error) {
        this.logger.error(`Falló la auto-validación de la entrada para el usuario ${userId} en el evento ${eventId}`, error);
    }
  }
}