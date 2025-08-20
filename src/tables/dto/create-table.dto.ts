import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateTableDto {
  @IsString()
  @IsNotEmpty({ message: 'El número de mesa es requerido.' })
  tableNumber: string;

  @IsUUID('4', { message: 'El ID de la categoría debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'La categoría es requerida.' })
  categoryId: string;

  @IsUUID('4', { message: 'El ID del evento debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'El evento es requerido.' })
  eventId: string;
}