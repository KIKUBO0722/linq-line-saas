import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReservationsService } from './reservations.service';

@Injectable()
export class ReservationsScheduler {
  private readonly logger = new Logger(ReservationsScheduler.name);

  constructor(private readonly reservationsService: ReservationsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleReminders() {
    try {
      const result = await this.reservationsService.processDueReminders();
      if (result.processed > 0) {
        this.logger.log(`Sent ${result.processed} reservation reminder(s)`);
      }
    } catch (error) {
      this.logger.error('Error processing reminders:', error);
    }
  }
}
