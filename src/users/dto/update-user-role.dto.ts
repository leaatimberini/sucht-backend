import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '../user.entity';

export class UpdateUserRoleDto {
  @IsNotEmpty()
  @IsEnum(UserRole)
  role: UserRole;
}