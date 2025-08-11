import { IsNotEmpty, IsString, IsNumber, Min, IsDateString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
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

  @IsOptional()
  @IsBoolean()
  allowPartialPayment?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  partialPaymentPrice?: number;

  // --- NUEVOS CAMPOS AÑADIDOS AL DTO ---

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
}