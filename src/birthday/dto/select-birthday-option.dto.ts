// src/birthday/dto/select-birthday-option.dto.ts
import { IsEnum, IsInt, IsNotEmpty, IsOptional, Max, Min } from 'class-validator';

export enum BirthdayOption {
  CLASSIC = 'classic',
  VIP = 'vip',
}

export class SelectBirthdayOptionDto {
  @IsNotEmpty()
  @IsEnum(BirthdayOption)
  choice: BirthdayOption;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10) // Límite máximo de invitados
  guestLimit?: number;
}