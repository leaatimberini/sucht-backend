import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateJobApplicationDto {
    @IsNotEmpty()
    @IsString()
    fullName: string;

    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @IsString()
    phone: string;

    @IsOptional()
    @IsString()
    position?: string;

    @IsOptional()
    @IsString()
    message?: string;

    @IsOptional()
    @IsString()
    instagram?: string;

    // cvUrl will be handled by the service after upload
    cvUrl?: string;
}
