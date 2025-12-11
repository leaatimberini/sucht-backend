// src/ticket-tiers/dto/create-ticket-tier.dto.ts

import { IsNotEmpty, IsString, IsNumber, Min, IsDateString, IsOptional, IsEnum, IsBoolean, IsInt, MaxLength, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { ProductType } from '../ticket-tier.entity';

export class CreateTicketTierDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsDateString()
  validUntil?: Date;

  @IsNotEmpty()
  @IsEnum(ProductType)
  productType: ProductType;

  @IsNotEmpty()
  @IsBoolean()
  isFree: boolean;

  @IsOptional()
  @IsBoolean()
  allowPartialPayment?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  partialPaymentPrice?: number;

  @IsOptional()
  @IsBoolean()
  isBirthdayDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isBirthdayVipOffer?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  consumptionCredit?: number;

  // --- CAMPOS SINCRONIZADOS Y AÑADIDOS AL DTO ---
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isVip?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  tableNumber?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @IsUUID()
  @IsNotEmpty()
  eventId: string;

  @IsOptional()
  @IsUUID('4')
  @Transform(({ value }) => value === "" ? null : value)
  linkedRewardId?: string;

  @IsOptional()
  @IsUUID('4')
  @Transform(({ value }) => value === "" ? null : value)
  tableCategoryId?: string;
  // --- FIN DE CAMPOS ---
}