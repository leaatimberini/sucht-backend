import { IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  flyerImageUrl?: string;

  /**
   * NUEVO CAMPO AÑADIDO: Permite actualizar la fecha de publicación.
   */
  @IsOptional()
  @IsDateString()
  publishAt?: string;
}