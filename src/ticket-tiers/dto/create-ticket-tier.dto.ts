import { IsNotEmpty, IsString, IsNumber, Min, IsDateString, IsOptional } from 'class-validator';

export class CreateTicketTierDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsDateString()
  validUntil?: Date;
}
