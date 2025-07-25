import { IsNotEmpty, IsInt, Min } from 'class-validator';

export class RedeemTicketDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantity: number; // Cantidad de personas que ingresan
}