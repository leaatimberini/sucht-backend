import { IsNotEmpty, IsUUID, IsInt, Min } from 'class-validator';

export class AcquireTicketDto {
  @IsNotEmpty()
  @IsUUID()
  eventId: string;

  @IsNotEmpty()
  @IsUUID()
  ticketTierId: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantity: number;
}