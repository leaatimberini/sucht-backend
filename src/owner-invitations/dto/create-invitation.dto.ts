import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsInt, Min, IsBoolean, IsArray, ValidateNested, IsUUID, Max } from 'class-validator';

// Un DTO interno para validar cada objeto en la lista de productos regalados
class GiftedProductDto {
  @IsUUID()
  @IsNotEmpty()
  tierId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateInvitationDto {
  @IsEmail({}, { message: 'Debe ser un correo electrónico válido.' })
  @IsNotEmpty({ message: 'El email del invitado es requerido.' })
  email: string;

  @IsInt({ message: 'La cantidad de invitados debe ser un número.' })
  @Min(0, { message: 'La cantidad de invitados no puede ser negativa.' })
  @Max(10, { message: 'El máximo de invitados es 10.' }) // Límite de la mesa
  guestCount: number;

  @IsBoolean()
  isVipAccess: boolean;

  @IsArray()
  @ValidateNested({ each: true }) // Valida cada objeto del array
  @Type(() => GiftedProductDto) // Especifica el tipo de objeto anidado
  giftedProducts: GiftedProductDto[];
}