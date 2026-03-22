import { IsString, IsOptional } from 'class-validator';

export class ImportCsvDto {
  @IsString()
  csv: string;
}

export class AssignTagDto {
  @IsString()
  tagId: string;
}

export class UpdateChatStatusDto {
  @IsString()
  status: string;
}
