// src/configuration/dto/update-configuration.dto.ts

import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class UpdateConfigurationDto {
  @IsOptional()
  @IsString()
  metaPixelId?: string;

  @IsOptional()
  @IsString()
  googleAnalyticsId?: string;

  // --- NUEVA PROPIEDAD PARA TÉRMINOS Y CONDICIONES ---
  @IsOptional()
  @IsString()
  @IsNotEmpty() // No debería ser un string vacío
  termsAndConditionsText?: string;
}