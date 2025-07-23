import { IsEmail, IsNotEmpty, IsUUID } from 'class-validator';

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
}