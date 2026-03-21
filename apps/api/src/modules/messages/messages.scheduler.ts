import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MessagesService } from './messages.service';

@Injectable()
export class MessagesScheduler {
  private readonly logger = new Logger(MessagesScheduler.name);

  constructor(private readonly messagesService: MessagesService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledBroadcasts() {
    try {
      const result = await this.messagesService.processDueBroadcasts();
      if (result.processed > 0) {
        this.logger.log(`Sent ${result.processed} scheduled broadcast(s)`);
      }
    } catch (error) {
      this.logger.error('Error processing scheduled broadcasts:', error);
    }
  }
}
