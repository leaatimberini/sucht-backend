import { IsString, IsNotEmpty, IsOptional, IsUrl, IsBoolean, IsDateString } from 'class-validator';

export class CreateBenefitDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    conditions?: string;

    @IsUrl()
    @IsOptional()
    imageUrl?: string;

    @IsDateString()
    @IsOptional()
    validFrom?: string;

    @IsDateString()
    @IsOptional()
    validUntil?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
