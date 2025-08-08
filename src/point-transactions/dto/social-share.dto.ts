import { IsNotEmpty, IsUUID } from 'class-validator';

export class SocialShareDto {
  @IsUUID()
  @IsNotEmpty()
  eventId: string;
}