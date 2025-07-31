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
  ticketTierId: string; // <-- AÑADIDO

  @IsInt()
  @Min(1)
  quantity?: number; // <-- AÑADIDO, ahora es obligatorio
  
}