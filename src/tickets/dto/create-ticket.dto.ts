// backend/src/tickets/dto/create-ticket.dto.ts

import { IsEmail, IsNotEmpty, IsUUID, IsInt, Min } from 'class-validator';

export class CreateTicketDto {
  @IsNotEmpty()
  @IsEmail()
  userEmail: string;

  @IsNotEmpty()
  @IsUUID()
  eventId: string;

  @IsNotEmpty()
  @IsUUID()
  ticketTierId: string;

  // CORRECCIÓN: 'quantity' ahora es obligatorio y debe ser un entero > 0
  @IsNotEmpty()
  @IsInt()
  @Min(1, { message: 'La cantidad debe ser al menos 1.' })
  quantity: number;
}