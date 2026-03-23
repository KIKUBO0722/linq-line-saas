import { IsString, IsEmail, IsOptional, IsIn } from 'class-validator';

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @IsIn(['admin', 'operator'])
  role?: string = 'operator';
}

export class UpdateRoleDto {
  @IsString()
  @IsIn(['admin', 'operator'])
  role: string;
}

export class AcceptInviteDto {
  @IsString()
  token: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  displayName?: string;
}
