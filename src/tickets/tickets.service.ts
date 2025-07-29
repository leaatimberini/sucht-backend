import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Not, Repository } from 'typeorm';
import { Ticket, TicketStatus } from './ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UsersService } from 'src/users/users.service';
import { EventsService } from 'src/events/events.service';
import { TicketTier } from 'src/ticket-tiers/ticket-tier.entity';
import { AcquireTicketDto } from './dto/acquire-ticket.dto';
import { User, UserRole } from 'src/users/user.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    @InjectRepository(TicketTier)
    private ticketTiersRepository: Repository<TicketTier>,
    private usersService: UsersService,
    private eventsService: EventsService,
    private mailService: MailService,
  ) {}

  private async acquire(
    user: User, 
    data: { eventId: string, ticketTierId: string, quantity: number },
    promoterUsername?: string
  ): Promise<Ticket> {
    const { eventId, ticketTierId, quantity } = data;
    const event = await this.eventsService.findOne(eventId);
    if (!event) throw new NotFoundException('Evento no encontrado.');
    if (new Date() > new Date(event.endDate)) {
      throw new BadRequestException('Este evento ya ha finalizado.');
    }
    const tier = await this.ticketTiersRepository.findOneBy({ id: ticketTierId });
    if (!tier) throw new NotFoundException('Tipo de entrada no encontrado.');
    if (tier.quantity < quantity) throw new BadRequestException(`No quedan suficientes entradas de este tipo. Disponibles: ${tier.quantity}.`);
    
    let promoter: User | null = null;
    if (promoterUsername) {
      promoter = await this.usersService.findOneByUsername(promoterUsername);
    }

    const newTicket = this.ticketsRepository.create({ user, event, tier, quantity, promoter });
    
    tier.quantity -= quantity;
    await this.ticketTiersRepository.save(tier);

    return this.ticketsRepository.save(newTicket);
  }

  async createByRRPP(createTicketDto: CreateTicketDto, promoter: User): Promise<Ticket> {
    const { userEmail, eventId, ticketTierId } = createTicketDto;
    const user = await this.usersService.findOrCreateByEmail(userEmail);
    const ticket = await this.acquire(user, { eventId, ticketTierId, quantity: 1 }, promoter.username);

    // Enviar correo
    await this.mailService.sendMail(
      user.email,
      '🎟️ Entrada creada por RRPP',
      `
      <h2>Hola ${user.name || ''} 👋</h2>
      <p>El RRPP <strong>@${promoter.username}</strong> te generó una entrada para <strong>${ticket.event.title}</strong>.</p>
      <p>Tipo: ${ticket.tier.name} — Cantidad: ${ticket.quantity}</p>
      <p>¡Te esperamos! 🎉</p>
      `
    );

    return ticket;
  }

  async acquireForClient(user: User, acquireTicketDto: AcquireTicketDto, promoterUsername?: string): Promise<Ticket> {
    const ticket = await this.acquire(user, acquireTicketDto, promoterUsername);

    // Enviar correo
    await this.mailService.sendMail(
      user.email,
      '🎟️ Entrada adquirida con éxito',
      `
      <h2>Hola ${user.name || ''} 👋</h2>
      <p>Tu entrada para <strong>${ticket.event.title}</strong> fue registrada correctamente.</p>
      <p>Tipo: ${ticket.tier.name} — Cantidad: ${ticket.quantity}</p>
      <p>Nos vemos el ${new Date(ticket.event.startDate).toLocaleDateString('es-AR')} 🎉</p>
      `
    );

    return ticket;
  }

  async findTicketsByUser(userId: string): Promise<Ticket[]> {
    return this.ticketsRepository.find({
      where: { user: { id: userId } },
      relations: ['event', 'tier', 'promoter'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(ticketId: string): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({ 
      where: { id: ticketId },
      relations: ['user', 'event', 'tier', 'promoter'],
    });
    if (!ticket) throw new NotFoundException('Entrada no válida o no encontrada.');
    return ticket;
  }

  async confirmAttendance(ticketId: string, userId: string): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({ where: { id: ticketId, user: { id: userId } } });
    if (!ticket) {
      throw new NotFoundException('Entrada no encontrada o no te pertenece.');
    }
    ticket.confirmedAt = new Date();
    return this.ticketsRepository.save(ticket);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleUnconfirmedTickets() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const unconfirmedTickets = await this.ticketsRepository.find({
      where: {
        confirmedAt: IsNull(),
        status: TicketStatus.VALID,
        event: {
          confirmationSentAt: Not(IsNull()) && LessThan(oneHourAgo),
        },
      },
      relations: ['tier', 'event', 'user'],
    });

    for (const ticket of unconfirmedTickets) {
      // 📩 Enviar recordatorio solo si aún no fue enviado
      if (!ticket.reminderSentAt && ticket.user.email) {
        await this.mailService.sendMail(
          ticket.user.email,
          `⏰ Recordatorio - Confirmá tu entrada para ${ticket.event.title}`,
          `
          <h2>Hola ${ticket.user.name || ''} 👋</h2>
          <p>🚨 Aún no confirmaste tu asistencia al evento <strong>${ticket.event.title}</strong>.</p>
          <p>Por favor, ingresá a <a href="https://sucht.com.ar">sucht.com.ar</a> para confirmar tu entrada.</p>
          <p>Tenés tiempo hasta 1 hora después del aviso inicial.</p>
          `
        );

        ticket.reminderSentAt = new Date();
        await this.ticketsRepository.save(ticket);

        console.log(`📧 Recordatorio enviado para ticket ${ticket.id}`);
      }

      if (ticket.event.confirmationSentAt) {
        const confirmationDeadline = new Date(ticket.event.confirmationSentAt);
        confirmationDeadline.setHours(confirmationDeadline.getHours() + 1);

        if (new Date() > confirmationDeadline) {
          const tier = ticket.tier;
          if (tier) {
            tier.quantity += ticket.quantity;
            await this.ticketTiersRepository.save(tier);
          }
          await this.ticketsRepository.remove(ticket);
          console.log(`❌ Ticket ${ticket.id} cancelado por falta de confirmación.`);
        }
      }
    }
  }

  async redeemTicket(ticketId: string, quantityToRedeem: number) {
    const ticket = await this.ticketsRepository.findOne({ 
      where: { id: ticketId },
      relations: ['user', 'event', 'tier'],
    });

    if (!ticket) throw new NotFoundException('Entrada no válida o no encontrada.');
    if (ticket.tier.validUntil && new Date() > new Date(ticket.tier.validUntil)) {
      throw new BadRequestException('Esta entrada ha expirado.');
    }

    if (ticket.status !== TicketStatus.VALID && ticket.status !== TicketStatus.PARTIALLY_USED) {
      throw new BadRequestException(`Esta entrada ya fue utilizada completamente o ha sido invalidada.`);
    }

    const remainingEntries = ticket.quantity - ticket.redeemedCount;
    if (quantityToRedeem > remainingEntries) {
      throw new BadRequestException(`Intento de canje inválido. Quedan ${remainingEntries} ingresos disponibles.`);
    }

    const validationTime = new Date();
    ticket.redeemedCount += quantityToRedeem;
    ticket.validatedAt = validationTime;

    if (ticket.redeemedCount >= ticket.quantity) {
      ticket.status = TicketStatus.USED;
    } else {
      ticket.status = TicketStatus.PARTIALLY_USED;
    }

    await this.ticketsRepository.save(ticket);

    const responseMessage = `${quantityToRedeem} Ingreso(s) Autorizado(s).`;

    return {
      message: responseMessage,
      status: ticket.status,
      userName: ticket.user.name,
      userEmail: ticket.user.email,
      eventName: ticket.event.title,
      ticketType: ticket.tier.name,
      redeemed: ticket.redeemedCount,
      total: ticket.quantity,
      validatedAt: validationTime.toLocaleString('es-AR'),
    };
  }
}
