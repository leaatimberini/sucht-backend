// src/store/dto/create-product.dto.ts
import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  // ===== NUEVO CAMPO PARA EL PRECIO ORIGINAL =====
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : Number(value)))
  originalPrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : Number(value)))
  stock?: number;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}