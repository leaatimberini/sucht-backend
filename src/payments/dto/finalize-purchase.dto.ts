// src/payments/dto/finalize-purchase.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class FinalizePurchaseDto {
  @IsString({ message: 'El ID de pago debe ser un texto.' })
  @IsNotEmpty({ message: 'El ID de pago no puede estar vacío.' })
  paymentId: string;
}