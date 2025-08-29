// src/payments/dto/create-talo-preference.dto.ts
import { IsNotEmpty, IsString, IsNumber, IsPositive, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class TaloSplitReceiverDto {
  @IsNotEmpty()
  @IsString()
  cbu_cvu: string;

  @IsNumber()
  @IsPositive()
  amount: number;
}

export class CreateTaloPreferenceDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  external_reference: string;
  
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaloSplitReceiverDto)
  split_receivers: TaloSplitReceiverDto[];
}