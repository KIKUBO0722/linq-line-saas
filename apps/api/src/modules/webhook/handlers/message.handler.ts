import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE, type DrizzleDB } from '../../../database/database.module';
import { messages, friends, lineAccounts } from '@line-saas/db';
import { eq, and } from 'drizzle-orm';
import { AiService } from '../../ai/ai.service';
import { LineService } from '../../line/line.service';

@Injectable()
export class MessageHandler {
  private readonly logger = new Logger(MessageHandler.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly aiService: AiService,
    private readonly lineService: LineService,
  ) {}

  async handle(
    event: any,
    account: typeof lineAccounts.$inferSelect,
    credentials: { channelSecret: string; channelAccessToken: string },
  ) {
    const userId = event.source?.userId;
    if (!userId) return;

    this.logger.log(`Message from ${userId}: ${event.message?.type}`);

    // Find the friend
    const [friend] = await this.db
      .select()
      .from(friends)
      .where(and(eq(friends.lineAccountId, account.id), eq(friends.lineUserId, userId)))
      .limit(1);

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

          this.logger.log(`AI replied to ${userId} (${aiResult.tokensUsed} tokens)`);
        }
      } catch (error) {
        this.logger.error(`AI auto-reply failed: ${error}`);
      }
    }
  }
}
