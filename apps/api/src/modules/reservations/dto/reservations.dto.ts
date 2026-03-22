import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateSlotDto {
  @IsString()
  name: string;

  @IsNumber()
  duration: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateReservationDto {
  @IsString()
  slotId: string;

  @IsOptional()
  @IsString()
  friendId?: string;

  @IsOptional()
  @IsString()
  guestName?: string;

  @IsString()
  date: string;

  @IsString()
  startTime: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsNumber()
  reminderMinutesBefore?: number;
}

export class SaveCalendarIntegrationDto {
  @IsString()
  calendarId: string;

  @IsString()
  serviceAccountKey: string;
}

export class UpdateReservationStatusDto {
  @IsString()
  status: string;
}
