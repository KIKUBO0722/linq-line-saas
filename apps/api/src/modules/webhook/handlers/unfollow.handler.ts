import { Injectable, Logger } from '@nestjs/common';
import { FriendsService } from '../../friends/friends.service';
import { AnalyticsService } from '../../analytics/analytics.service';
import { lineAccounts } from '@line-saas/db';

@Injectable()
export class UnfollowHandler {
  private readonly logger = new Logger(UnfollowHandler.name);

  constructor(
    private readonly friendsService: FriendsService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async handle(event: any, account: typeof lineAccounts.$inferSelect) {
    const userId = event.source?.userId;
    if (!userId) return;

    this.logger.log(`Unfollow event from ${userId}`);

    // ブロックコンテキストを記録（失敗してもmarkUnfollowedは実行される）
    await this.analyticsService.recordBlockEvent(account.tenantId, account.id, userId);

    await this.friendsService.markUnfollowed(account.id, userId);
  }
}
