import { Module } from '@nestjs/common';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { ReservationsScheduler } from './reservations.scheduler';
import { GoogleCalendarService } from './google-calendar.service';
import { AuthModule } from '../auth/auth.module';
import { LineModule } from '../line/line.module';

@Module({
  imports: [AuthModule, LineModule],
  controllers: [ReservationsController],
  providers: [ReservationsService, ReservationsScheduler, GoogleCalendarService],
  exports: [ReservationsService, GoogleCalendarService],
})
export class ReservationsModule {}
