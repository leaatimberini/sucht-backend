// src/tickets/dto/acquire-ticket.dto.ts

import { IsString, IsNotEmpty, IsInt, Min, IsOptional, IsEnum } from 'class-validator';

export class AcquireTicketDto {
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsString()
  @IsNotEmpty()
  ticketTierId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsEnum(['full', 'partial'])
  paymentType?: 'full' | 'partial';

  // --- CAMPO AÑADIDO ---
  // Se añade promoterUsername como un string opcional para que la validación no falle.
  @IsOptional()
  @IsString()
  promoterUsername?: string;
  
}