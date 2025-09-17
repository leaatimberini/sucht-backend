// src/ticket-tiers/dto/create-ticket-tier.dto.ts

import { IsNotEmpty, IsString, IsNumber, Min, IsDateString, IsOptional, IsEnum, IsBoolean, IsInt, MaxLength } from 'class-validator';
import { ProductType } from '../ticket-tier.entity';

export class CreateTicketTierDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @IsNotEmpty()
  @IsNumber()
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

  // --- CAMPOS AÑADIDOS AL DTO PARA MESAS VIP ---
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
  // --- FIN DE CAMPOS AÑADIDOS ---

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
  @IsBoolean()
  isVip?: boolean; // Campo añadido para reflejar la entidad

  @IsOptional()
  @IsNumber()
  @Min(0)
  consumptionCredit?: number;

  @IsNotEmpty()
  @IsString() // Asumimos que el eventId vendrá en el body
  eventId: string;
}