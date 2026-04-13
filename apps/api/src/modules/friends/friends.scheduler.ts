import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FriendsService } from './friends.service';

@Injectable()
export class FriendsScheduler {
  private readonly logger = new Logger(FriendsScheduler.name);

  constructor(private readonly friendsService: FriendsService) {}

  @Cron(CronExpression.EVERY_6_HOURS)
  async handleEngagementTierRefresh() {
    try {
      const updated = await this.friendsService.refreshAllTiers();
      if (updated > 0) {
        this.logger.log(`Refreshed engagement tiers: ${updated} friend(s) updated`);
      }
    } catch (error) {
      this.logger.error('Error refreshing engagement tiers:', error);
    }
  }
}
