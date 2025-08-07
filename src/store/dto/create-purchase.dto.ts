import { IsNotEmpty, IsUUID, IsInt, Min, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

// DTO para cada ítem dentro del carrito
class CartItemDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreatePurchaseDto {
  @IsUUID()
  @IsNotEmpty()
  eventId: string;

  // Se reemplaza productId/quantity por un array de items
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => CartItemDto)
  items: CartItemDto[];
}