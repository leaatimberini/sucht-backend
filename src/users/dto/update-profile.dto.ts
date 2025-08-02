// backend/src/users/dto/update-profile.dto.ts

import { IsOptional, IsString, Length, IsDateString, Matches, IsDecimal } from 'class-validator';

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

  @IsOptional()
  @IsString()
  mpAccessToken?: string;

  @IsOptional()
  @IsString()
  mpUserId?: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  rrppCommissionRate?: number;
  
  // CORRECCIÓN: Se agrega la propiedad 'profileImageUrl' al DTO
  @IsOptional()
  @IsString()
  profileImageUrl?: string;
}