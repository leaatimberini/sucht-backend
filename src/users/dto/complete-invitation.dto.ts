// backend/src/users/dto/complete-invitation.dto.ts
import { IsNotEmpty, IsString, MinLength, IsDateString } from 'class-validator';

export class CompleteInvitationDto {
  @IsString()
  @IsNotEmpty({ message: 'El token de invitación es requerido.' })
  token: string;

  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres.' })
  name: string;

  @IsDateString({}, { message: 'Por favor, introduce una fecha de nacimiento válida.' })
  @IsNotEmpty({ message: 'La fecha de nacimiento es requerida.' })
  dateOfBirth: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password: string;
}