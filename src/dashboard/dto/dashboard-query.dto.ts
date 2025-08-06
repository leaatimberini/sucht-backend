// backend/src/dashboard/dto/dashboard-query.dto.ts
import { IsOptional, IsString, IsUUID, IsNumber, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class DashboardQueryDto {
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
  
  // Se añade la propiedad 'limit' al DTO
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number) // Transforma el string del query param a número
  limit?: number;
}