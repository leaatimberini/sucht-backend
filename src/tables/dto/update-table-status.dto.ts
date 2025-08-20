import { IsEnum } from 'class-validator';
import { TableStatus } from '../table.entity';

export class UpdateTableStatusDto {
  @IsEnum(TableStatus)
  status: TableStatus;
}