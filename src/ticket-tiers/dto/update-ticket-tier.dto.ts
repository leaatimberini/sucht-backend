// src/ticket-tiers/dto/update-ticket-tier.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateTicketTierDto } from './create-ticket-tier.dto';

export class UpdateTicketTierDto extends PartialType(CreateTicketTierDto) {}