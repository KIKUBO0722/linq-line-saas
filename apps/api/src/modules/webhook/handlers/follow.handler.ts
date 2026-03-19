import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE, type DrizzleDB } from '../../../database/database.module';
import { FriendsService } from '../../friends/friends.service';
import { LineService } from '../../line/line.service';
import { lineAccounts } from '@line-saas/db';

@Injectable()
export class FollowHandler {
  private readonly logger = new Logger(FollowHandler.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly friendsService: FriendsService,
    private readonly lineService: LineService,
  ) {}

  async handle(
    event: any,
    account: typeof lineAccounts.$inferSelect,
    credentials: { channelSecret: string; channelAccessToken: string },
  ) {
    const userId = event.source?.userId;
    if (!userId) return;

    this.logger.log(`Follow event from ${userId}`);

    // Get profile from LINE
    let profile: any = null;
    try {
      profile = await this.lineService.getProfile(credentials, userId);
    } catch (error) {
      this.logger.warn(`Failed to get profile for ${userId}: ${error}`);
    }

    // Upsert friend
    await this.friendsService.upsertFriend({
      tenantId: account.tenantId,
      lineAccountId: account.id,
      lineUserId: userId,
      displayName: profile?.displayName,
      pictureUrl: profile?.pictureUrl,
      statusMessage: profile?.statusMessage,
      language: profile?.language,
      isFollowing: true,
      followedAt: new Date(),
    });
  }
}
