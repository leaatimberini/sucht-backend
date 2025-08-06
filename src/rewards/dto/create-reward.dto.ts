import { IsString, IsNotEmpty, IsInt, Min, IsOptional, IsUrl, IsBoolean } from 'class-validator';

export class CreateRewardDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  pointsCost: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}