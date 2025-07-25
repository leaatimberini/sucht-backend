import { IsOptional, IsString, Length, IsDateString } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(3, 50)
  name?: string;

  @IsOptional()
  @IsString()
  instagramHandle?: string;

  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  // --- NUEVO CAMPO ---
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}