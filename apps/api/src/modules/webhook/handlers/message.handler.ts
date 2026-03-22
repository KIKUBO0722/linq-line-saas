import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE, type DrizzleDB } from '../../../database/database.module';
import { messages, friends, lineAccounts } from '@line-saas/db';
import { eq, and } from 'drizzle-orm';
import { AiService } from '../../ai/ai.service';
import { LineService } from '../../line/line.service';
import { FriendsService } from '../../friends/friends.service';
import { BillingService } from '../../billing/billing.service';

@Injectable()
export class MessageHandler {
  private readonly logger = new Logger(MessageHandler.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly aiService: AiService,
    private readonly lineService: LineService,
    private readonly friendsService: FriendsService,
    private readonly billingService: BillingService,
  ) {}

  async handle(
    event: any,
    account: typeof lineAccounts.$inferSelect,
    credentials: { channelSecret: string; channelAccessToken: string },
  ) {
    const userId = event.source?.userId;
    if (!userId) return;

    this.logger.log(`Message from ${userId}: ${event.message?.type}`);

    // Find the friend, auto-register if not exists
    let [friend] = await this.db
      .select()
      .from(friends)
      .where(and(eq(friends.lineAccountId, account.id), eq(friends.lineUserId, userId)))
      .limit(1);

    if (!friend) {
      this.logger.log(`Auto-registering friend: ${userId}`);
      let profile: any = null;
      try {
        profile = await this.lineService.getProfile(credentials, userId);
      } catch (error) {
        this.logger.warn(`Failed to get profile for ${userId}: ${error}`);
      }
      friend = await this.friendsService.upsertFriend({
        tenantId: account.tenantId,
        lineAccountId: account.id,
        lineUserId: userId,
        displayName: profile?.displayName || 'LINE User',
        pictureUrl: profile?.pictureUrl,
        statusMessage: profile?.statusMessage,
        language: profile?.language,
        isFollowing: true,
        followedAt: new Date(),
      });
    }

    // Update engagement score (+1 for sending a message) and mark as unread
    if (friend?.id) {
      await this.friendsService.updateScore(friend.id, 1);
      await this.friendsService.updateChatStatus(friend.id, 'unread', account.tenantId);
    }

    // Store inbound message
    await this.db.insert(messages).values({
      tenantId: account.tenantId,
      lineAccountId: account.id,
      friendId: friend?.id,
      direction: 'inbound',
      messageType: event.message?.type || 'unknown',
      content: event.message || {},
      lineMessageId: event.message?.id,
      sendType: 'reply',
      status: 'delivered',
      sentAt: new Date(),
    });

    // AI auto-reply for text messages
    if (event.message?.type === 'text' && friend && event.replyToken) {
      const userText = event.message.text;

      // Check AI token limit before processing
      const aiCheck = await this.billingService.checkLimit(account.tenantId, 'aiTokensUsed');
      if (!aiCheck.allowed) {
        this.logger.warn(`AI token limit reached for tenant ${account.tenantId}`);
        return;
      }

      try {
        const aiResult = await this.aiService.generateAutoReply(
          account.tenantId,
          friend.id,
          userText,
        );

        if (aiResult) {
          // Send AI reply via LINE Reply API (free, no message cost)
          await this.lineService.replyMessage(credentials, event.replyToken, [
            { type: 'text', text: aiResult.reply },
          ]);

          // Store outbound AI message
          await this.db.insert(messages).values({
            tenantId: account.tenantId,
            lineAccountId: account.id,
            friendId: friend.id,
            direction: 'outbound',
            messageType: 'text',
            content: { type: 'text', text: aiResult.reply },
            sendType: 'reply',
            status: 'sent',
            sentAt: new Date(),
          });

          // Track AI token usage
          await this.billingService.incrementUsage(account.tenantId, 'aiTokensUsed', 1);

          this.logger.log(`AI replied to ${userId} (${aiResult.tokensUsed} tokens)`);
        }
      } catch (error) {
        this.logger.error(`AI auto-reply failed: ${error}`);
      }
    }
  }
}
