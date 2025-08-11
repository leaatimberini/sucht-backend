import { IsOptional, IsString, IsNotEmpty, IsBoolean, IsNumber, IsUUID } from 'class-validator';
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

  @IsOptional()
  @IsBoolean()
  isRewardsStoreEnabled?: boolean;

  // --- CAMPO AÑADIDO PARA EL PREMIO DE CUMPLEAÑOS ---
  @IsOptional()
  @IsUUID('4', { message: 'El ID del premio de cumpleaños debe ser un UUID válido.' })
  birthday_reward_id?: string;
}