import { IsString, IsOptional, IsBoolean, IsNumber, Min, Max, IsUUID, IsArray, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateConfigurationDto {
    // --- Campos existentes ---
    @IsOptional()
    @IsString()
    termsAndConditionsText?: string;

    @IsOptional()
    @IsString()
    birthday_reward_id?: string;

    @IsOptional()
    @IsString()
    google_review_reward_id?: string;

    // --- Nuevos campos para Pagos ---
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    paymentsEnabled?: boolean;

    @IsOptional()
    @IsUUID('4')
    paymentOwnerUserId?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    adminServiceFeePercentage?: number;

    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    rrppCommissionEnabled?: boolean;

    // --- Nuevos campos para Métodos de Pago ---
    @IsOptional()
    @IsArray()
    @IsIn(['mercadopago', 'talo'], { each: true })
    enabledPaymentMethods?: string[];

    // --- Otros campos existentes ---
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    notifications_birthday_enabled?: boolean;

    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    notifications_raffle_enabled?: boolean;

    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    notifications_newEvent_enabled?: boolean;

    // --- Campos para Sistema de Puntos ---
    @IsOptional()
    @IsNumber()
    @Min(0)
    points_attendance?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    points_successful_referral?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    points_social_share?: number;
}