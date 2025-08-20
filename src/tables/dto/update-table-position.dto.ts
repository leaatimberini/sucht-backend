import { IsNumber, Min, Max } from 'class-validator';

export class UpdateTablePositionDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  positionX: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  positionY: number;
}