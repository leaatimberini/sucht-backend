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

  // --- NUEVOS CAMPOS ---
  @IsNotEmpty() // CORRECCIÓN: 'productType' es obligatorio
  @IsEnum(ProductType)
  productType: ProductType;

  // CORRECCIÓN: 'isFree' es una nueva propiedad para distinguir las entradas
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
}