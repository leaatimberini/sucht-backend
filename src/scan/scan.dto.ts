// backend/src/scan/scan.dto.ts
import { IsNotEmpty, IsString, IsInt, Min, IsOptional } from 'class-validator';

export class ScanDataDto {
  @IsString()
  @IsNotEmpty()
  qrData: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  guestsEntered?: number;
}