import { IsNotEmpty, IsUUID, IsInt, Min } from 'class-validator';

export class CreateBirthdayBenefitDto {
  @IsUUID()
  @IsNotEmpty()
  eventId: string;

  @IsInt()
  @Min(0) // Puede ser 0 si solo asiste el cumpleañero
  guestCount: number;
}