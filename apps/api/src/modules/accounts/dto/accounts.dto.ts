import { IsString, IsOptional, Matches, MaxLength } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  channelId: string;

  @IsString()
  channelSecret: string;

  @IsString()
  channelAccessToken: string;

  @IsOptional()
  @IsString()
  botName?: string;
}

export class UpdateBrandingDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  appName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'primaryColor must be a valid hex color (#RRGGBB)' })
  primaryColor?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'sidebarColor must be a valid hex color (#RRGGBB)' })
  sidebarColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  faviconUrl?: string;
}
