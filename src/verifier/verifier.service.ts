import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { TicketsService } from '../tickets/tickets.service';
import { StoreService } from '../store/store.service';
import { User, UserRole } from '../users/user.entity';
import { RewardsService } from '../rewards/rewards.service';

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
        
        const redemptionResult = await this.ticketsService.redeemTicket(qrId, 1);
        
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
        this.logger.log(`QR ${qrId} no es un ticket, continuando búsqueda...`);
      } else {
        this.logger.error(`Error al canjear ticket ${qrId}: ${error.message}`);
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
            
            const validationResult = await this.rewardsService.validateUserReward(qrId);

            return {
                type: 'product',
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
        if (error instanceof NotFoundException) {
           // No es un premio, por lo que no existe.
        } else {
            this.logger.error(`Error al validar premio ${qrId}: ${error.message}`);
            throw error;
        }
    }
    
    // Si no se encontró en ninguna de las tres tablas
    this.logger.error(`El código QR ${qrId} no fue encontrado en ninguna tabla.`);
    throw new NotFoundException('El código QR no es válido o no fue encontrado.');
  }
}