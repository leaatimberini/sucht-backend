import { IsOptional, IsString, IsNotEmpty, IsBoolean, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

// Este DTO define los datos que el frontend puede enviar para actualizar la configuración.
// Todos los campos son opcionales para permitir actualizaciones parciales (PATCH).
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

  @IsOptional()
  @IsBoolean() // Se asegura que el valor entrante sea un booleano (true/false)
  paymentsEnabled?: boolean;

  @IsOptional()
  @Type(() => Number) // Transforma el valor entrante a número
  @IsNumber({ maxDecimalPlaces: 2 })
  adminServiceFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  rrppCommissionRate?: number;

  @IsOptional()
  @IsBoolean()
  isRewardsStoreEnabled?: boolean;
}