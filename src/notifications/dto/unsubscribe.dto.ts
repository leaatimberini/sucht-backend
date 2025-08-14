import { IsString, IsNotEmpty, IsUrl } from 'class-validator';

export class UnsubscribeDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  endpoint: string;
}