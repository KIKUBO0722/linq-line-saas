import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StepsService } from './steps.service';

@Injectable()
export class StepsScheduler {
  private readonly logger = new Logger(StepsScheduler.name);

  constructor(private readonly stepsService: StepsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleStepProcessing() {
    try {
      const result = await this.stepsService.processDueSteps();
      if (result.processed > 0) {
        this.logger.log(`Processed ${result.processed} due step(s)`);
      }
    } catch (error) {
      this.logger.error('Error processing due steps:', error);
    }
  }
}
