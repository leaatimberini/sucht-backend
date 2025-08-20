// src/tables/tables.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

@Injectable()
export class TablesService {
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
  ) {}

  // --- Lógica de Categorías ---
  async createCategory(name: string): Promise<TableCategory> {
    const category = this.tableCategoryRepository.create({ name });
    return this.tableCategoryRepository.save(category);
  }

  async findAllCategories(): Promise<TableCategory[]> {
    return this.tableCategoryRepository.find();
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
      relations: ['category'],
      order: { tableNumber: 'ASC' },
    });
  }

  // --- Lógica de Reservas ---
  
  /**
   * NUEVO MÉTODO: Obtiene la lista detallada de reservas para un evento.
   */
  async getReservationsForEvent(eventId: string): Promise<TableReservation[]> {
    return this.reservationRepository.find({
        where: { eventId },
        relations: ['table', 'table.category', 'reservedByUser', 'ticket'],
        order: { createdAt: 'DESC' }
    });
  }

  /**
   * NUEVO MÉTODO: Permite a un admin/dueño/organizador registrar una venta manual.
   */
  async reserveTableManually(staffUser: User, dto: CreateManualReservationDto): Promise<TableReservation> {
    const { eventId, tableId, clientName, clientEmail, paymentType, amountPaid, guestCount } = dto;

    const table = await this.tableRepository.findOneBy({ id: tableId, eventId });
    if (!table) throw new NotFoundException('La mesa seleccionada no existe o no pertenece a este evento.');
    if (table.status !== TableStatus.AVAILABLE) throw new BadRequestException('La mesa ya no está disponible.');
    
    // Asumimos que cada mesa vendida tiene un "producto" (TicketTier) asociado
    const vipTier = await this.ticketTiersService.findVipTierForEvent(eventId);
    if (!vipTier) throw new NotFoundException('No se ha configurado un producto (TicketTier) de tipo Mesa VIP para este evento.');

    // 1. Crear el Ticket/QR para el cliente
    const ticket = await this.ticketsService.createTicketInternal(
        { email: clientEmail, name: clientName } as User, // Creamos un objeto parcial de usuario
        { eventId, ticketTierId: vipTier.id, quantity: guestCount },
        staffUser,
        amountPaid,
        null, // No hay paymentId de MP
        'MANUAL_SALE',
        true, // Las mesas VIP siempre tienen acceso VIP
        `Mesa ${table.tableNumber} (${table.category.name})`
    );

    // 2. Crear el registro de la reserva
    const reservation = this.reservationRepository.create({
        eventId,
        tableId,
        clientName,
        clientEmail,
        reservedByUser: staffUser,
        paymentType,
        totalPrice: Number(vipTier.price),
        amountPaid,
        guestCount,
        ticketId: ticket.id,
    });
    const savedReservation = await this.reservationRepository.save(reservation);

    // 3. Actualizar el estado de la mesa
    table.status = TableStatus.OCCUPIED;
    table.ticketId = ticket.id;
    await this.tableRepository.save(table);

    // 4. (Opcional) Enviar email de confirmación
    // await this.ticketsService.sendManualReservationEmail(clientEmail, reservationDetails...);

    return savedReservation;
  }
}