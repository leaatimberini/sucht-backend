// backend/src/scan/scan.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { TicketsService } from '../tickets/tickets.service';
import { BirthdayService } from '../birthday/birthday.service';

@Injectable()
export class ScanService {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly birthdayService: BirthdayService,
  ) {}

  async processScan(qrData: string, guestsEntered?: number) {
    try {
      const parsedData = JSON.parse(qrData);

      // --- Ruteo para Beneficios de Cumpleaños ---
      if (parsedData.type === 'BIRTHDAY_ENTRY' && parsedData.id) {
        if (!guestsEntered) {
            throw new BadRequestException('Se requiere la cantidad de invitados para canjear una entrada de cumpleaños.');
        }
        return this.birthdayService.claimEntry(parsedData.id, guestsEntered);
      }
      
      if (parsedData.type === 'BIRTHDAY_GIFT' && parsedData.id) {
        return this.birthdayService.claimGift(parsedData.id);
      }

      throw new BadRequestException('Tipo de QR no reconocido.');

    } catch (error) {
        if (error instanceof SyntaxError) {
          // Si no es JSON, es un TICKET NORMAL.
          // Aquí adaptamos la lógica a tu sistema de canje de tickets.
          // Por ahora, lo validamos y devolvemos un mensaje.
          // En el futuro, esto llamaría a `ticketsService.redeem(qrData)`.
          const ticket = await this.ticketsService.findOne(qrData);
          if (!ticket) throw new NotFoundException('Ticket no válido o no encontrado.');
          return { message: 'Ticket Válido', type: 'TICKET', data: ticket };
        }
        throw error;
    }
  }
}