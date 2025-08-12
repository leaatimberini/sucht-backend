import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsInt, Min, IsBoolean, IsArray, ValidateNested, IsUUID, Max } from 'class-validator';

class GiftedProductDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string; // <-- CORRECCIÓN: Renombrado de 'tierId' a 'productId'

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
  @Max(10, { message: 'El máximo de invitados es 10.' })
  guestCount: number;

  @IsBoolean()
  isVipAccess: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GiftedProductDto)
  giftedProducts: GiftedProductDto[];
}