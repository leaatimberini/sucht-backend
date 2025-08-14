import { IsOptional, IsString, IsNotEmpty, IsBoolean, IsNumber, IsUUID } from 'class-validator';
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

  // --- CAMPO CORREGIDO Y AÑADIDO ---
  @IsOptional()
  @IsUUID('4', { message: 'El ID del premio de cumpleaños debe ser un UUID válido.' })
  birthday_reward_id?: string;

  // --- NUEVO CAMPO PARA EL PREMIO DEL SORTEO ---
  @IsOptional()
  @IsUUID('4', { message: 'El ID del premio del sorteo debe ser un UUID válido.' })
  raffle_prize_product_id?: string;
}