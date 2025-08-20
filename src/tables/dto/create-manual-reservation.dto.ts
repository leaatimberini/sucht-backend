// src/tables/dto/create-manual-reservation.dto.ts
import { IsString, IsNotEmpty, IsUUID, IsEnum, IsNumber, Min, IsEmail, IsOptional } from 'class-validator';
import { PaymentType } from '../table-reservation.entity';

export class CreateManualReservationDto {
  @IsUUID('4')
  @IsNotEmpty()
  eventId: string;

  @IsUUID('4')
  @IsNotEmpty()
  tableId: string;

  @IsString()
  @IsNotEmpty()
  clientName: string;

  @IsEmail()
  @IsOptional()
  clientEmail?: string;

  @IsEnum(PaymentType)
  @IsNotEmpty()
  paymentType: PaymentType;

  @IsNumber()
  @Min(0)
  amountPaid: number;

  @IsNumber()
  @Min(1)
  guestCount: number;
}