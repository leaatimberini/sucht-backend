// src/events/dto/create-event.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty({ message: 'El título es requerido.' })
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty({ message: 'La ubicación es requerida.' })
  location: string;

  @IsDateString()
  @IsNotEmpty({ message: 'La fecha de inicio es requerida.' })
  startDate: string;

  @IsDateString()
  @IsNotEmpty({ message: 'La fecha de fin es requerida.' })
  endDate: string;
  
  /**
   * NUEVO CAMPO: La fecha y hora en que el evento debe ser publicado.
   * Es opcional. Si no se provee, el evento se publica inmediatamente.
   */
  @IsOptional()
  @IsDateString()
  publishAt?: string;
}