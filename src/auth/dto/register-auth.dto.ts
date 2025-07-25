import { IsEmail, IsNotEmpty, IsString, MinLength, IsDateString } from 'class-validator';

export class RegisterAuthDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password: string;

  // --- NUEVO CAMPO ---
  @IsNotEmpty({ message: 'La fecha de nacimiento es requerida.' })
  @IsDateString()
  dateOfBirth: string;
}