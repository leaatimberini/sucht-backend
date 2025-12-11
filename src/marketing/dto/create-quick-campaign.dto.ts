import { IsString, IsNumber, IsEnum, IsNotEmpty, IsDateString, Min } from 'class-validator';

export class CreateQuickCampaignDto {
    @IsNotEmpty()
    @IsString()
    eventId: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    budget: number;

    @IsNotEmpty()
    @IsEnum(['IG', 'FB'], { message: 'Platform must be either IG or FB' })
    platform: 'IG' | 'FB';

    @IsNotEmpty()
    @IsDateString()
    endDate: string;
}
