// src/configuration/dto/update-configuration.dto.ts

import { IsOptional, IsString } from 'class-validator';

export class UpdateConfigurationDto {
  @IsOptional()
  @IsString()
  metaPixelId?: string;

  @IsOptional()
  @IsString()
  googleAnalyticsId?: string;

  // Aquí podrían ir otras configuraciones que ya existan
  // Ejemplo:
  // @IsOptional()
  // @IsNumberString()
  // adminServiceFee?: string;
}