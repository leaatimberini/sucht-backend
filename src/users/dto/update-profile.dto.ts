// backend/src/users/dto/update-profile.dto.ts

import { IsOptional, IsString, Length, IsDateString, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(3, 50)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(3, 20)
  @Matches(/^[a-zA-Z0-9_.]+$/, {
    message: 'El nombre de usuario solo puede contener letras, números, guiones bajos y puntos.',
  })
  username?: string;

  @IsOptional()
  @IsString()
  instagramHandle?: string;

  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  // --- CORRECCIÓN ---
  // Se ha cambiado el nombre de la propiedad para que coincida con la entidad User.
  @IsOptional()
  @IsString()
  mpAccessToken?: string;

  // AÑADIMOS ESTA PROPIEDAD TAMBIÉN para que los RRPP puedan configurarla
  @IsOptional()
  @IsString()
  mpUserId?: string;
}