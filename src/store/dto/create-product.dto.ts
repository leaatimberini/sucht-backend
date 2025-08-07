import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, IsUrl, IsBoolean, IsInt } from 'class-validator';

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
  originalPrice?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}