import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../../database/database.module';
import { FriendsService } from '../../friends/friends.service';
import { LineService } from '../../line/line.service';
import { StepsService } from '../../steps/steps.service';
import { AiService } from '../../ai/ai.service';
import { GreetingsService } from '../../greetings/greetings.service';
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
    private readonly greetingsService: GreetingsService,
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

    // Check if this is a re-follow (user previously unfollowed/blocked)
    const existingFriend = await this.friendsService.findByLineUserId(
      account.id,
      userId,
    );
    const isReFollow = existingFriend?.unfollowedAt != null;

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
      await this.friendsService.updateEngagement(friend.id);
    }

    // Send greeting message (priority: greeting_messages > aiConfig.welcomeMessage)
    try {
      const greetingType = isReFollow ? 're_follow' : 'new_follow';
      const greeting = await this.greetingsService.getByType(
        account.tenantId,
        greetingType,
      );

      if (greeting && Array.isArray(greeting.messages) && greeting.messages.length > 0) {
        // Use greeting_messages template
        await this.lineService.pushMessage(
          credentials,
          userId,
          greeting.messages as any[],
        );
        this.logger.log(`Sent ${greetingType} greeting to ${userId}`);
      } else {
        // Fallback to AI config welcome message
        const aiConfig = await this.aiService.getConfig(account.tenantId);
        if (aiConfig?.welcomeMessage) {
          await this.lineService.pushMessage(credentials, userId, [
            { type: 'text', text: aiConfig.welcomeMessage },
          ]);
          this.logger.log(`Sent welcome message (fallback) to ${userId}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to send greeting: ${error}`);
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
        await this.stepsService.enrollFriend(account.tenantId, friend.id, scenario.id);
        this.logger.log(`Enrolled friend ${friend.id} in scenario ${scenario.name}`);
      }
    } catch (error) {
      this.logger.error(`Auto-enrollment failed: ${error}`);
    }
  }
}
