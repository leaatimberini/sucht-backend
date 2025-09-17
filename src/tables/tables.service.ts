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
  ) {}

  // --- Lógica de Categorías ---
  async createCategory(name: string): Promise<TableCategory> {
    const category = this.tableCategoryRepository.create({ name });
    return this.tableCategoryRepository.save(category);
  }

  async findAllCategories(): Promise<TableCategory[]> {
    return this.tableCategoryRepository.find({ order: { name: 'ASC' } });
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
    const { eventId, tableId, clientName, clientEmail, paymentType, amountPaid, guestCount } = dto;

    const staffUser = await this.usersService.findOneById(staffUserFromToken.id);
    if (!staffUser) {
        throw new InternalServerErrorException('No se pudieron verificar los datos del staff.');
    }

    const table = await this.tableRepository.findOneBy({ id: tableId, eventId });
    if (!table) throw new NotFoundException('La mesa seleccionada no existe o no pertenece a este evento.');
    if (table.status !== TableStatus.AVAILABLE) throw new BadRequestException('La mesa ya no está disponible.');
    
    const vipTiers = await this.ticketTiersService.findVipTiersForEvent(eventId);
    if (!vipTiers || vipTiers.length === 0) {
      throw new NotFoundException('No se ha configurado un producto (TicketTier) de tipo Mesa VIP para este evento.');
    }
    const vipTier = vipTiers[0];
    
    const clientAsUserObject = { email: clientEmail || `${clientName.replace(/\s+/g, '.')}@manual.sale`, name: clientName } as User;

    const ticket = await this.ticketsService.createTicketInternal(
        clientAsUserObject,
        { eventId, ticketTierId: vipTier.id, quantity: guestCount },
        staffUser, amountPaid, null, 'MANUAL_SALE',
        `Mesa ${table.tableNumber} (${table.category.name})`
    );

    const reservation = this.reservationRepository.create({
        eventId, tableId, clientName, clientEmail,
        reservedByUser: staffUser,
        paymentType,
        totalPrice: Number(vipTier.price),
        amountPaid, guestCount,
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
              <p style="margin: 10px 0;"><strong style="color: #ffffff;">Monto Total:</strong> $${reservation.totalPrice.toFixed(2)}</p>
              <p style="margin: 10px 0;"><strong style="color: #ffffff;">Monto Pagado:</strong> $${reservation.amountPaid.toFixed(2)}</p>
              ${amountRemaining > 0 ? `<p style="margin: 10px 0; color: #facc15;"><strong style="color: #ffffff;">Saldo Pendiente:</strong> $${amountRemaining.toFixed(2)}</p>` : ''}
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
}