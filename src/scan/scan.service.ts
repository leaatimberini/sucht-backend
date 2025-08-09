import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { TicketsService } from '../tickets/tickets.service';
import { BirthdayService } from '../birthday/birthday.service';
import { Ticket } from 'src/tickets/ticket.entity';

@Injectable()
export class ScanService {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly birthdayService: BirthdayService,
  ) {}

  /**
   * Procesa los datos de un QR escaneado y lo dirige al servicio correspondiente.
   * @param qrData El string de datos crudos del QR.
   * @param guestsEntered El número de invitados (opcional, solo para ingresos de cumpleaños).
   * @returns El resultado de la acción de canje o validación.
   */
  async processScan(qrData: string, guestsEntered?: number) {
    try {
      // Intenta analizar el QR como si fuera un objeto JSON
      const parsedData = JSON.parse(qrData);

      // --- Ruteo para Beneficios de Cumpleaños ---
      if (parsedData.type === 'BIRTHDAY_ENTRY' && parsedData.id) {
        if (!guestsEntered || guestsEntered <= 0) {
            throw new BadRequestException('Se requiere un número válido de invitados para canjear una entrada de cumpleaños.');
        }
        return this.birthdayService.claimEntry(parsedData.id, guestsEntered);
      }
      
      if (parsedData.type === 'BIRTHDAY_GIFT' && parsedData.id) {
        // Para el regalo, no necesitamos guestsEntered.
        return this.birthdayService.claimGift(parsedData.id);
      }

      // Si el JSON tiene un 'type' pero no lo reconocemos, es un error.
      throw new BadRequestException('Tipo de QR no reconocido.');

    } catch (error) {
        // Si el error es de sintaxis, significa que no era un JSON.
        // Asumimos que es un TICKET NORMAL (un UUID).
        if (error instanceof SyntaxError) {
          const ticket = await this.ticketsService.findOne(qrData);
          if (!ticket) {
            throw new NotFoundException('Ticket no válido o no encontrado.');
          }
          
          // Si el ticket no es grupal, podemos canjearlo directamente
          if(ticket.quantity === 1) {
            // NOTA: Aquí iría tu lógica de canje de ticket individual, por ejemplo:
            // return this.ticketsService.redeem(ticket.id, 1);
            // Por ahora, solo lo validamos:
            return { message: 'Ticket individual validado.', type: 'TICKET_REDEEMED', data: ticket };
          }
          
          // Si es grupal, le decimos al frontend que necesita pedir la cantidad de personas
          return { message: 'Ticket grupal encontrado.', type: 'PROMPT_GROUP_TICKET', data: ticket };
        }
        // Si es otro tipo de error (ej. NotFoundException de los otros servicios), lo relanzamos.
        throw error;
    }
  }
}