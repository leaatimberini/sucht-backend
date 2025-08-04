// backend/src/events/dto/update-event.dto.ts

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

  // CORRECCIÓN: Se agrega la propiedad 'flyerImageUrl' al DTO
  @IsOptional()
  @IsString()
  flyerImageUrl?: string;
}