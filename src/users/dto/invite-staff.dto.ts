import { IsEmail, IsNotEmpty, IsArray, IsEnum } from 'class-validator';
import { UserRole } from '../user.entity';

export class InviteStaffDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles: UserRole[];
}