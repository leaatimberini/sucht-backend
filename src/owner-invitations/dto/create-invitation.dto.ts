// backend/src/owner-invitations/dto/create-invitation.dto.ts
import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsInt, Min, IsBoolean, IsArray, ValidateNested, IsUUID, Max, IsOptional } from 'class-validator';

class GiftedProductDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateInvitationDto {
  @IsEmail({}, { message: 'Debe ser un correo electrónico válido.' })
  @IsNotEmpty({ message: 'El email del invitado es requerido.' })
  email: string;

  // --- CAMPOS AHORA OPCIONALES ---
  @IsOptional()
  @IsInt({ message: 'La cantidad de invitados debe ser un número.' })
  @Min(0, { message: 'La cantidad de invitados no puede ser negativa.' })
  @Max(20, { message: 'El máximo de invitados es 20.' })
  guestCount?: number;

  @IsOptional()
  @IsBoolean()
  isVipAccess?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GiftedProductDto)
  giftedProducts: GiftedProductDto[];
}