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

  // --- CAMPO AÑADIDO ---
  @IsOptional()
  @IsString()
  mercadoPagoAccessToken?: string;
}