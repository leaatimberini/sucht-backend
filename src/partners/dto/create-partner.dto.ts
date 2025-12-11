import { IsString, IsNotEmpty, IsOptional, IsUrl, IsBoolean } from 'class-validator';

export class CreatePartnerDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsUrl()
    @IsOptional()
    logoUrl?: string;

    @IsUrl()
    @IsOptional()
    coverUrl?: string;

    @IsString()
    @IsOptional()
    address?: string;

    @IsUrl()
    @IsOptional()
    websiteUrl?: string;

    @IsString()
    @IsOptional()
    instagramUrl?: string;

    @IsString()
    @IsOptional()
    whatsapp?: string;

    @IsString()
    @IsOptional()
    category?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
