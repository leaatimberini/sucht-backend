import { IsOptional, IsString, IsNotEmpty, IsBooleanString, IsNumberString } from 'class-validator';

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

  // --- CAMPOS AÑADIDOS ---
  @IsOptional()
  @IsBooleanString()
  paymentsEnabled?: string;

  @IsOptional()
  @IsNumberString()
  rrppCommissionRate?: string;

  @IsOptional()
  @IsNumberString()
  adminServiceFee?: string;
}