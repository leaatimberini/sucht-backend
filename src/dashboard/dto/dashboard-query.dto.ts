// src/dashboard/dto/dashboard-query.dto.ts

import { IsOptional, IsString, IsUUID } from 'class-validator';

// Este DTO se usará para validar los query params de los endpoints de métricas.
// Asegura que si los parámetros vienen, tengan el formato correcto, y si no vienen, no haya error.
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
}