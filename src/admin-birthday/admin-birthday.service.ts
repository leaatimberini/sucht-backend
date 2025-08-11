import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm'; // <-- SE AÑADE 'In' A LA IMPORTACIÓN
import { Ticket } from '../tickets/ticket.entity';
import { UserReward } from '../rewards/user-reward.entity';
import { TicketsService } from '../tickets/tickets.service';

@Injectable()
export class AdminBirthdayService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    @InjectRepository(UserReward)
    private readonly userRewardsRepository: Repository<UserReward>,
    private readonly ticketsService: TicketsService, 
  ) {}

  /**
   * Obtiene un resumen consolidado de todos los beneficios de cumpleaños reclamados para un evento.
   * @param eventId El ID del evento a consultar.
   */
  async getBirthdayBenefitsSummary(eventId: string) {
    // 1. Buscar todos los tickets de cumpleaños para el evento
    const birthdayTickets = await this.ticketsRepository.find({
      where: {
        origin: 'BIRTHDAY',
        event: { id: eventId },
      },
      relations: ['user', 'tier'],
    });

    if (birthdayTickets.length === 0) {
        return []; // Si no hay tickets, devolvemos un array vacío
    }

    // 2. Buscar todos los premios de cumpleaños para los usuarios que tienen tickets
    const userIdsWithTickets = birthdayTickets.map(t => t.user.id);
    const birthdayRewards = await this.userRewardsRepository.find({
        where: {
            origin: 'BIRTHDAY',
            userId: In(userIdsWithTickets), // Usamos el operador 'In'
        },
        relations: ['reward']
    });

    // 3. Consolidar la información por usuario
    const summary = birthdayTickets.map(ticket => {
      const userReward = birthdayRewards.find(reward => reward.userId === ticket.user.id);
      
      return {
        user: {
          id: ticket.user.id,
          name: ticket.user.name,
          email: ticket.user.email,
        },
        ticket: {
          id: ticket.id,
          guestLimit: ticket.quantity - 1, // Restamos 1 (el cumpleañero) para mostrar solo invitados
          guestsEntered: ticket.redeemedCount,
          isEntryClaimed: ticket.status === 'redeemed' || ticket.status === 'partially_used' || ticket.status === 'used',
        },
        reward: {
          name: userReward ? userReward.reward.name : 'N/A',
          isGiftClaimed: !!userReward?.redeemedAt,
        },
      };
    });

    return summary;
  }

  /**
   * Permite a un admin modificar la cantidad de invitados de un ticket de cumpleaños.
   * @param ticketId El ID del ticket de cumpleaños a modificar.
   * @param newGuestLimit El nuevo número de invitados (no incluye al cumpleañero).
   */
  async updateGuestLimit(ticketId: string, newGuestLimit: number) {
    const ticket = await this.ticketsRepository.findOneBy({ id: ticketId, origin: 'BIRTHDAY' });
    if (!ticket) {
      throw new NotFoundException('No se encontró el ticket de cumpleaños especificado.');
    }

    // La cantidad en el ticket es (invitados + 1)
    ticket.quantity = newGuestLimit + 1;
    
    return this.ticketsRepository.save(ticket);
  }
}