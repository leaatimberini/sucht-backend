// src/tables/tables.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Table, TableStatus } from './table.entity';
import { TableCategory } from './table-category.entity';
import { EventsService } from 'src/events/events.service';
import { TableReservation, PaymentType } from './table-reservation.entity';
import { User } from 'src/users/user.entity';
import { CreateManualReservationDto } from './dto/create-manual-reservation.dto';
import { TicketsService } from 'src/tickets/tickets.service';
import { TicketStatus } from 'src/tickets/ticket.entity'; // Added Import
import { TicketTiersService } from 'src/ticket-tiers/ticket-tiers.service';
import { MailService } from 'src/mail/mail.service';
import { ConfigurationService } from 'src/configuration/configuration.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class TablesService {
  private readonly logger = new Logger(TablesService.name);

  constructor(
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    @InjectRepository(TableCategory)
    private readonly tableCategoryRepository: Repository<TableCategory>,
    @InjectRepository(TableReservation)
    private readonly reservationRepository: Repository<TableReservation>,
    private readonly eventsService: EventsService,
    private readonly ticketsService: TicketsService,
    private readonly ticketTiersService: TicketTiersService,
    private readonly mailService: MailService,
    private readonly configurationService: ConfigurationService,
    private readonly usersService: UsersService,
  ) { }

  // --- Lógica de Categorías ---
  async createCategory(name: string): Promise<TableCategory> {
    try {
      const category = this.tableCategoryRepository.create({ name });
      return await this.tableCategoryRepository.save(category);
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new BadRequestException(`La categoría '${name}' ya existe.`);
      }
      throw new InternalServerErrorException('Error al crear la categoría.');
    }
  }

  async findAllCategories(): Promise<TableCategory[]> {
    return this.tableCategoryRepository.find({ order: { name: 'ASC' } });
  }

  async setCategoryPrice(eventId: string, categoryId: string, price: number, capacity?: number, depositPrice?: number): Promise<any> {
    const category = await this.tableCategoryRepository.findOneBy({ id: categoryId });
    if (!category) throw new NotFoundException('Categoría no encontrada.');

    return this.ticketTiersService.ensureTierForCategory(eventId, categoryId, price, category.name, capacity, depositPrice);
  }

  // --- Lógica de Mesas ---
  async createTable(tableNumber: string, categoryId: string, eventId: string): Promise<Table> {
    const event = await this.eventsService.findOne(eventId);
    if (!event) throw new NotFoundException('Evento no encontrado.');

    const category = await this.tableCategoryRepository.findOneBy({ id: categoryId });
    if (!category) throw new NotFoundException('Categoría de mesa no encontrada.');

    const table = this.tableRepository.create({ tableNumber, category, event, status: TableStatus.AVAILABLE });
    return this.tableRepository.save(table);
  }

  async findTablesForEvent(eventId: string): Promise<Table[]> {
    return this.tableRepository.find({
      where: { eventId },
      relations: ['category', 'ticket', 'ticket.user'],
      order: { tableNumber: 'ASC' },
    });
  }

  async updateTablePosition(tableId: string, positionX: number, positionY: number): Promise<Table> {
    const table = await this.tableRepository.findOneBy({ id: tableId });
    if (!table) throw new NotFoundException('Mesa no encontrada.');

    table.positionX = positionX;
    table.positionY = positionY;

    return this.tableRepository.save(table);
  }

  async updateTableStatus(tableId: string, status: TableStatus): Promise<Table> {
    const table = await this.tableRepository.findOneBy({ id: tableId });
    if (!table) throw new NotFoundException('Mesa no encontrada.');

    if (table.status === TableStatus.RESERVED && status === TableStatus.AVAILABLE) {
      throw new BadRequestException('No se puede liberar una mesa que fue reservada con un pago online.');
    }

    table.status = status;

    // --- LOGIC TO INVALIDATE TICKET ON RELEASE ---
    if (status === TableStatus.AVAILABLE && table.ticketId) {
      try {
        const ticket = await this.ticketsService.findOne(table.ticketId);
        if (ticket && ticket.status !== TicketStatus.INVALIDATED) {
          this.logger.log(`Invalidando ticket ${table.ticketId} asociado a la mesa ${table.tableNumber} al liberarla.`);
          // Invalidate ticket status
          await this.ticketsService.updateStatus(table.ticketId, TicketStatus.INVALIDATED, null);
        }
      } catch (error) {
        this.logger.warn(`No se pudo invalidar el ticket ${table.ticketId} al liberar la mesa: ${error.message}`);
      }
      // Remove link to avoid future confusion
      table.ticketId = null;
    }
    // ---------------------------------------------

    return this.tableRepository.save(table);
  }

  // --- Lógica de Reservas ---

  async getReservationsForEvent(eventId: string): Promise<TableReservation[]> {
    return this.reservationRepository.find({
      where: { eventId },
      relations: ['table', 'table.category', 'reservedByUser', 'ticket'],
      order: { createdAt: 'DESC' }
    });
  }

  async reserveTableManually(staffUserFromToken: User, dto: CreateManualReservationDto): Promise<TableReservation> {
    const { eventId, tableId, clientName, paymentType, amountPaid, guestCount, ticketTierId } = dto;
    const clientEmail = dto.clientEmail ? dto.clientEmail.trim() : undefined;

    const staffUser = await this.usersService.findOneById(staffUserFromToken.id);
    if (!staffUser) {
      throw new InternalServerErrorException('No se pudieron verificar los datos del staff.');
    }

    const table = await this.tableRepository.findOneBy({ id: tableId, eventId });
    if (!table) throw new NotFoundException('La mesa seleccionada no existe o no pertenece a este evento.');
    if (table.status !== TableStatus.AVAILABLE) throw new BadRequestException('La mesa ya no está disponible.');

    // LOGIC FIX: Prioritize explicit ticketTierId, otherwise try to match by tableNumber
    let vipTier: any = null;

    if (ticketTierId) {
      vipTier = await this.ticketTiersService.findOne(ticketTierId);
      if (!vipTier || vipTier.eventId !== eventId) {
        throw new BadRequestException('El producto seleccionado no es válido para este evento.');
      }
    } else {
      // Fallback: Try to find a tier that matches the table number (Smart Auto-Assign)
      const allVipTiers = await this.ticketTiersService.findVipTiersForEvent(eventId);
      const tableNum = parseInt(table.tableNumber.trim(), 10);

      if (!isNaN(tableNum)) {
        vipTier = allVipTiers.find(t => t.tableNumber === tableNum);
      }

      // NEW Fallback: Check if there is a Tier for this Table's Category
      if (!vipTier) {
        vipTier = allVipTiers.find(t => t.tableCategoryId === table.categoryId);
      }

      // Final Fallback: If no match, take the first one (only if explicitly allowed or legacy behavior)
      if (!vipTier && allVipTiers.length > 0) {
        vipTier = allVipTiers[0];
      }
    }

    // Fix: Validar si el usuario ya existe para vincularlo correctamente
    let clientUser: User;
    const existingUser = clientEmail ? await this.usersService.findOneByEmail(clientEmail) : null;

    if (existingUser) {
      clientUser = existingUser;
    } else {
      // Create a temporary object for the ticket, but it won't be linked to a real account for login
      // unless we explicitly create a user which we are not doing here to avoid auth issues.
      // Ideally, if the user registers later with this email, we should link the tickets.
      clientUser = { email: clientEmail || `${clientName.replace(/\s+/g, '.')}@manual.sale`, name: clientName } as User;
    }

    if (!vipTier) {
      throw new NotFoundException('No se ha encontrado un producto (TicketTier) válido para asignar a esta mesa. Configura las Tarifas VIP primero.');
    }

    // Fix: Logic for 'gift' payment type
    let finalAmountPaid = amountPaid;
    let finalTotalPrice = Number(vipTier.price);

    if (paymentType === 'gift') {
      finalAmountPaid = finalTotalPrice; // Mark as fully paid/bonified
    }

    const ticket = await this.ticketsService.createTicketInternal(
      clientUser,
      { eventId, ticketTierId: vipTier.id, quantity: guestCount },
      staffUser, finalAmountPaid, null, 'MANUAL_SALE',
      `Mesa ${table.tableNumber} (${table.category.name})`
    );

    const reservation = this.reservationRepository.create({
      eventId, tableId, clientName, clientEmail,
      reservedByUser: staffUser,
      paymentType,
      totalPrice: finalTotalPrice,
      amountPaid: finalAmountPaid,
      guestCount,
      ticketId: ticket.id,
    });
    const savedReservation = await this.reservationRepository.save(reservation);

    table.status = TableStatus.OCCUPIED;
    table.ticketId = ticket.id;
    await this.tableRepository.save(table);

    if (clientEmail) {
      await this.sendConfirmationEmail(savedReservation, table, staffUser);
    }

    return savedReservation;
  }

  private async sendConfirmationEmail(reservation: TableReservation, table: Table, staffUser: User) {
    if (!reservation.clientEmail) {
      this.logger.warn(`Intento de enviar email de confirmación para la reserva ${reservation.id} sin un email de cliente.`);
      return;
    }

    const event = await this.eventsService.findOne(reservation.eventId);
    const frontendUrl = await this.configurationService.get('FRONTEND_URL') || 'https://sucht.com.ar';
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${reservation.ticketId}`;
    const amountRemaining = reservation.totalPrice - reservation.amountPaid;

    // Logic for Payment Display in Email
    let paymentDetailsHtml = '';
    if (reservation.paymentType === 'gift') {
      paymentDetailsHtml = `
         <p style="margin: 10px 0;"><strong style="color: #ffffff;">Estado:</strong> <span style="color: #D6006D; font-weight: bold; text-transform: uppercase;">100% BONIFICADO (Regalo)</span></p>
         <p style="margin: 10px 0; font-size: 14px; color: #888;">Disfruta de tu mesa sin cargo.</p>
       `;
    } else {
      paymentDetailsHtml = `
         <p style="margin: 10px 0;"><strong style="color: #ffffff;">Monto Total:</strong> $${reservation.totalPrice.toFixed(2)}</p>
         <p style="margin: 10px 0;"><strong style="color: #ffffff;">Monto Pagado:</strong> $${reservation.amountPaid.toFixed(2)}</p>
         ${amountRemaining > 0 ? `<p style="margin: 10px 0; color: #facc15;"><strong style="color: #ffffff;">Saldo Pendiente:</strong> $${amountRemaining.toFixed(2)}</p>` : `<p style="margin: 10px 0; color: #4ade80;"><strong style="color: #ffffff;">Estado:</strong> PAGADO</p>`}
       `;
    }

    const emailHtml = `
      <div style="background-color: #121212; color: #ffffff; font-family: Arial, sans-serif; padding: 40px; text-align: center;">
        <div style="max-width: 600px; margin: auto; background-color: #1e1e1e; border-radius: 12px; overflow: hidden; border: 1px solid #333;">
          <div style="padding: 24px; background-color: #000000;">
            <h1 style="color: #ffffff; font-size: 28px; margin: 0;">SUCHT</h1>
          </div>
          <div style="padding: 30px;">
            <h2 style="color: #ffffff; font-size: 24px; margin-top: 0;">Hola ${reservation.clientName},</h2>
            <p style="color: #bbbbbb; font-size: 16px;">Tu reserva para la mesa ${table.tableNumber} en <strong>${event.title}</strong> está confirmada.</p>
            
            <div style="margin: 30px 0; border: 2px solid #D6006D; border-radius: 12px; padding: 20px; background-color: #2a2a2a;">
              <h3 style="color: #ffffff; margin: 5px 0 15px 0; font-size: 22px;">QR de Ingreso - Mesa ${table.tableNumber}</h3>
              <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 10px auto; max-width: 180px;"><img src="${qrApiUrl}" alt="QR de Ingreso" /></div>
              <p style="color: #bbbbbb; margin-top: 15px; font-size: 16px;">Válido para ${reservation.guestCount} personas</p>
              <p style="color: #D6006D; font-weight: bold; margin-top: 10px;">INGRESO PREFERENCIAL</p>
            </div>

            <div style="background-color: #2a2a2a; border-radius: 8px; padding: 20px; margin-bottom: 30px; text-align: left;">
              <h3 style="color: #ffffff; margin-top: 0; border-bottom: 1px solid #444; padding-bottom: 10px;">Detalles de la Reserva</h3>
              <p style="margin: 10px 0;"><strong style="color: #ffffff;">Gestionada por:</strong> ${staffUser.name}</p>
              ${paymentDetailsHtml}
            </div>
            
            <a href="${frontendUrl}/mi-cuenta" target="_blank" style="display: inline-block; background-color: #D6006D; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">VER EN MI CUENTA</a>
          </div>
        </div>
      </div>
    `;

    await this.mailService.sendMail(
      reservation.clientEmail,
      `Confirmación de Reserva - Mesa ${table.tableNumber} en SUCHT`,
      emailHtml
    );
    this.logger.log(`Email de confirmación de reserva manual enviado a ${reservation.clientEmail}`);
  }

  async deleteReservation(id: string): Promise<void> {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
      relations: ['table', 'ticket']
    });

    if (!reservation) throw new NotFoundException('Reserva no encontrada.');

    // 1. Invalidate Ticket
    if (reservation.ticketId) {
      try {
        await this.ticketsService.updateStatus(reservation.ticketId, TicketStatus.INVALIDATED, null);
      } catch (error) {
        this.logger.warn(`Error invalidating ticket during reservation deletion: ${error.message}`);
      }
    }

    // 2. Release Table if currently occupied by this reservation
    if (reservation.table && reservation.table.ticketId === reservation.ticketId) {
      reservation.table.status = TableStatus.AVAILABLE;
      reservation.table.ticketId = null;
      await this.tableRepository.save(reservation.table);
    }

    // 3. Delete Reservation Record
    await this.reservationRepository.remove(reservation);
  }
}