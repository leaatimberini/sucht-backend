import { IsNotEmpty, IsDateString, IsInt, Min, IsArray, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

class PrizeDto {
  @IsUUID('4')
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(1)
  prizeRank: number;
}

export class ConfigureRaffleDto {
  @IsNotEmpty()
  @IsDateString()
  drawDate: string;

  @IsInt()
  @Min(1)
  numberOfWinners: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrizeDto)
  prizes: PrizeDto[];
}