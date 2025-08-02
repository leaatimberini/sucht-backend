// backend/src/configuration/dto/update-configuration.dto.ts

import { IsOptional, IsString, IsNotEmpty, IsBoolean, IsNumber, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateConfigurationDto {
  @IsOptional()
  @IsString()
  metaPixelId?: string;

  @IsOptional()
  @IsString()
  googleAnalyticsId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  termsAndConditionsText?: string;

  // --- CAMPOS CORREGIDOS ---
  @IsOptional()
  @IsBoolean()
  paymentsEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  adminServiceFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  rrppCommissionRate?: number;
}