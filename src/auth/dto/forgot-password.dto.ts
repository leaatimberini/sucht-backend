import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Por favor, introduce un email válido.' })
  @IsNotEmpty({ message: 'El email es requerido.' })
  email: string;
}