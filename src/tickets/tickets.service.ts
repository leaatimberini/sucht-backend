import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Not, Repository, Between, In } from 'typeorm';
import { Ticket, TicketStatus } from './ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UsersService } from 'src/users/users.service';
import { EventsService } from 'src/events/events.service';
import { TicketTier, ProductType } from 'src/ticket-tiers/ticket-tier.entity';
import { AcquireTicketDto } from './dto/acquire-ticket.dto';
import { User } from 'src/users/user.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MailService } from 'src/mail/mail.service';
import { DashboardQueryDto } from 'src/dashboard/dto/dashboard-query.dto';

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
    promoter: User | null,
    amountPaid: number,
  ): Promise<Ticket> {
    const { eventId, ticketTierId, quantity } = data;
    const event = await this.eventsService.findOne(eventId);
    if (!event) throw new NotFoundException('Evento no encontrado.');
    if (new Date() > new Date(event.endDate)) {
      throw new BadRequestException('Este evento ya ha finalizado.');
    }
    const tier = await this.ticketTiersRepository.findOneBy({ id: ticketTierId });
    if (!tier) throw new NotFoundException('Tipo de entrada no encontrado.');
    if (tier.quantity < quantity) throw new BadRequestException(`No quedan suficientes. Disponibles: ${tier.quantity}.`);
    
    let status = TicketStatus.VALID;
    const totalPrice = tier.price * quantity;
    if (amountPaid > 0 && amountPaid < totalPrice) {
      status = TicketStatus.PARTIALLY_PAID;
    }

    const newTicket = this.ticketsRepository.create({ 
      user, 
      event, 
      tier, 
      quantity, 
      promoter,
      amountPaid,
      status,
    });
    
    tier.quantity -= quantity;
    await this.ticketTiersRepository.save(tier);

    return this.ticketsRepository.save(newTicket);
  }

  async createByRRPP(createTicketDto: CreateTicketDto, promoter: User): Promise<Ticket> {
    const { userEmail, eventId, ticketTierId, quantity = 1 } = createTicketDto;
    const user = await this.usersService.findOrCreateByEmail(userEmail);
    const ticket = await this.acquire(user, { eventId, ticketTierId, quantity }, promoter, 0);

    await this.mailService.sendMail(
      user.email,
      '🎟️ Tienes una nueva entrada de RRPP',
      `
      <h2>Hola ${user.name || ''} 👋</h2>
      <p>El RRPP <strong>@${promoter.username}</strong> te generó una entrada para <strong>${ticket.event.title}</strong>.</p>
      <p>Tipo: ${ticket.tier.name} — Válida para: ${ticket.quantity} persona(s)</p>
      <p>¡Te esperamos! 🎉</p>
      `
    );

    return ticket;
  }

  async acquireForClient(
    user: User, 
    acquireTicketDto: AcquireTicketDto, 
    promoterUsername?: string,
    amountPaid: number = 0,
  ): Promise<Ticket> {
    let promoter: User | null = null;
    if (promoterUsername) {
      promoter = await this.usersService.findOneByUsername(promoterUsername);
    }
    const ticket = await this.acquire(user, acquireTicketDto, promoter, amountPaid);

    await this.mailService.sendMail(
      user.email,
      '🎟️ Entrada adquirida con éxito',
      `
      <h2>Hola ${user.name || ''} 👋</h2>
      <p>Tu entrada para <strong>${ticket.event.title}</strong> fue registrada correctamente.</p>
      <p>Tipo: ${ticket.tier.name} — Válida para: ${ticket.quantity} persona(s)</p>
      <p>Nos vemos el ${new Date(ticket.event.startDate).toLocaleDateString('es-AR')} 🎉</p>
      `
    );

    return ticket;
  }
  
  async getFullHistory(filters: DashboardQueryDto): Promise<Ticket[]> {
    const { eventId, startDate, endDate } = filters;

    const queryOptions: any = {
      relations: ['user', 'event', 'tier', 'promoter'],
      order: {
        createdAt: 'DESC',
      },
      where: {},
    };

    if (eventId) {
      queryOptions.where.event = { id: eventId };
    }

    if (startDate && endDate) {
      queryOptions.where.createdAt = Between(new Date(startDate), new Date(endDate));
    }
    
    return this.ticketsRepository.find(queryOptions);
  }

  async getScanHistory(eventId: string): Promise<Ticket[]> {
    return this.ticketsRepository.find({
      where: {
        event: { id: eventId },
        validatedAt: Not(IsNull()),
      },
      relations: ['user', 'tier'],
      order: {
        validatedAt: 'DESC',
      },
      take: 50,
    });
  }

  async getPremiumProducts(eventId: string): Promise<Ticket[]> {
    return this.ticketsRepository.find({
      where: {
        event: { id: eventId },
        tier: {
          productType: In([ProductType.VIP_TABLE, ProductType.VOUCHER]),
        },
      },
      relations: ['user', 'tier'],
      order: {
        createdAt: 'ASC',
      },
    });
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
    const ticket = await this.ticketsRepository.findOne({ where: { id: ticketId, user: { id: userId } }, relations: ['event'] });
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
      const tier = ticket.tier;
      if (tier) {
        tier.quantity += ticket.quantity;
        await this.ticketTiersRepository.save(tier);
      }
      await this.ticketsRepository.remove(ticket);
      console.log(`❌ Ticket ${ticket.id} cancelado por falta de confirmación.`);
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

    if (ticket.status !== TicketStatus.VALID && ticket.status !== TicketStatus.PARTIALLY_USED && ticket.status !== TicketStatus.PARTIALLY_PAID) {
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
    } else if (ticket.status === TicketStatus.VALID) {
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