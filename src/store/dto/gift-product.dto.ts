import { IsEmail, IsNotEmpty, IsUUID, IsInt, Min } from 'class-validator';

export class GiftProductDto {
  @IsEmail({}, { message: 'Debe ser un correo electrónico válido.' })
  @IsNotEmpty({ message: 'El email del cliente es requerido.' })
  email: string;

  @IsUUID()
  @IsNotEmpty({ message: 'El ID del producto es requerido.' })
  productId: string;

  @IsUUID()
  @IsNotEmpty({ message: 'El ID del evento es requerido.' })
  eventId: string;

  @IsInt()
  @Min(1, { message: 'La cantidad debe ser al menos 1.'})
  quantity: number;
}