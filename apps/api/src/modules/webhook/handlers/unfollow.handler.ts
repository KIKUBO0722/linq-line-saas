import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE, type DrizzleDB } from '../../../database/database.module';
import { FriendsService } from '../../friends/friends.service';
import { lineAccounts } from '@line-saas/db';

@Injectable()
export class UnfollowHandler {
  private readonly logger = new Logger(UnfollowHandler.name);

  constructor(private readonly friendsService: FriendsService) {}

  async handle(event: any, account: typeof lineAccounts.$inferSelect) {
    const userId = event.source?.userId;
    if (!userId) return;

    this.logger.log(`Unfollow event from ${userId}`);

    await this.friendsService.markUnfollowed(account.id, userId);
  }
}
