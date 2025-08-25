import { IsNotEmpty, IsString } from 'class-validator';

export class SignedUrlDto {
  @IsString()
  @IsNotEmpty()
  publicId: string;
}