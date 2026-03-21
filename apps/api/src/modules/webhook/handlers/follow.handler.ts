import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../../database/database.module';
import { FriendsService } from '../../friends/friends.service';
import { LineService } from '../../line/line.service';
import { StepsService } from '../../steps/steps.service';
import { AiService } from '../../ai/ai.service';
import { lineAccounts, stepScenarios } from '@line-saas/db';

@Injectable()
export class FollowHandler {
  private readonly logger = new Logger(FollowHandler.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly friendsService: FriendsService,
    private readonly lineService: LineService,
    private readonly stepsService: StepsService,
    private readonly aiService: AiService,
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
    const friend = await this.friendsService.upsertFriend({
      tenantId: account.tenantId,
      lineAccountId: account.id,
      lineUserId: userId,
      displayName: profile?.displayName,
      pictureUrl: profile?.pictureUrl,
      statusMessage: profile?.statusMessage,
      language: profile?.language,
      isFollowing: true,
      followedAt: new Date(),
      acquisitionSource: 'follow',
    });

    // Update engagement score (+5 for following/re-following)
    if (friend?.id) {
      await this.friendsService.updateScore(friend.id, 5);
    }

    // Send welcome message if configured
    try {
      const aiConfig = await this.aiService.getConfig(account.tenantId);
      if (aiConfig?.welcomeMessage) {
        await this.lineService.pushMessage(credentials, userId, [
          { type: 'text', text: aiConfig.welcomeMessage },
        ]);
        this.logger.log(`Sent welcome message to ${userId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send welcome message: ${error}`);
    }

    // Auto-enroll in active "follow" trigger scenarios
    try {
      const followScenarios = await this.db
        .select()
        .from(stepScenarios)
        .where(
          and(
            eq(stepScenarios.tenantId, account.tenantId),
            eq(stepScenarios.triggerType, 'follow'),
            eq(stepScenarios.isActive, true),
          ),
        );

      for (const scenario of followScenarios) {
        await this.stepsService.enrollFriend(friend.id, scenario.id);
        this.logger.log(`Enrolled friend ${friend.id} in scenario ${scenario.name}`);
      }
    } catch (error) {
      this.logger.error(`Auto-enrollment failed: ${error}`);
    }
  }
}
