// backend/src/organizer/dto/create-organizer-invitation.dto.ts
import { IsEmail, IsNotEmpty, IsInt, Min, Max, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateOrganizerInvitationDto {
  @IsEmail({}, { message: 'Debe ser un correo electrónico válido.' })
  @IsNotEmpty({ message: 'El email del invitado es requerido.' })
  email: string;

  // FIX: Se añade la propiedad eventId que faltaba.
  @IsUUID('4', { message: 'El ID del evento debe ser un UUID válido.'})
  @IsNotEmpty({ message: 'El ID del evento es requerido.' })
  eventId: string;

  @IsInt({ message: 'La cantidad de invitados debe ser un número.' })
  @Min(0, { message: 'La cantidad de invitados no puede ser negativa.' })
  @Max(20, { message: 'El máximo de invitados es 20.' })
  guestCount: number;

  @IsBoolean()
  @IsOptional()
  isVipAccess?: boolean;
}