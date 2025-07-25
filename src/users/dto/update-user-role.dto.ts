import { IsArray, IsEnum } from 'class-validator';
import { UserRole } from '../user.entity';

export class UpdateUserRoleDto {
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles: UserRole[];
}