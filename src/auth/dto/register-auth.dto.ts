// Añade IsEnum y IsOptional aquí
import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
// Importa el enum de Role que creamos
import { Role } from '../enums/role.enum';

export class RegisterAuthDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  // --- AÑADE ESTAS LÍNEAS ---
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
  // --------------------------
}