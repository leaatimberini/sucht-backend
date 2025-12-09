
import { IsUUID, IsNumber, Min, IsNotEmpty, IsOptional } from 'class-validator';

export class SetCategoryPriceDto {
    @IsUUID('4')
    @IsNotEmpty()
    eventId: string;

    @IsUUID('4')
    @IsNotEmpty()
    categoryId: string;

    @IsNumber()
    @Min(0)
    price: number;

    @IsNumber()
    @Min(1)
    @IsOptional()
    capacity?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    depositPrice?: number;
}
