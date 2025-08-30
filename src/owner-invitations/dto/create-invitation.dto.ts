// src/owner-invitations/dto/create-invitation.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';

class GiftedProductDto {
  @ApiProperty({
    description: 'ID of the product to be gifted.',
    example: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Quantity of the product to be gifted.',
    example: 2,
  })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateInvitationDto {
  @ApiProperty({
    description: 'Email of the user to invite.',
    example: 'cliente@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'ID of the event for which the invitation is being created.',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  @IsUUID()
  @IsNotEmpty()
  eventId: string;

  @ApiPropertyOptional({
    description:
      'Number of additional guests the ticket is valid for (e.g., 1 means ticket is for 2 people).',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  guestCount?: number;

  @ApiPropertyOptional({
    description: 'Grants VIP access with the entry ticket.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isVipAccess?: boolean;

  @ApiPropertyOptional({
    description: 'List of products to be gifted.',
    type: [GiftedProductDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GiftedProductDto)
  giftedProducts?: GiftedProductDto[];
}