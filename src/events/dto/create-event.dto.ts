import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  // El campo para la imagen se maneja por separado y no necesita estar en el DTO
  // cuando se usa FileInterceptor de la manera en que lo hemos configurado.
}
