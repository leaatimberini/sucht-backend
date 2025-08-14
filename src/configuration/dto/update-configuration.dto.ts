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

  @IsOptional()
  @IsUUID('4')
  birthday_reward_id?: string;

  @IsOptional()
  @IsUUID('4')
  raffle_prize_product_id?: string;

  // --- NUEVOS CAMPOS AÑADIDOS PARA LAS NOTIFICACIONES ---
  @IsOptional()
  @IsBoolean()
  notifications_newEvent_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  notifications_birthday_enabled?: boolean;
  
  @IsOptional()
  @IsBoolean()
  notifications_raffle_enabled?: boolean;
}