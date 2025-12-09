import { IsString, IsNumber, Min, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProductDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    price?: number;

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