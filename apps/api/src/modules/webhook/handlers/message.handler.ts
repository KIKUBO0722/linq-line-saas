import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE, type DrizzleDB } from '../../../database/database.module';
import { messages, friends, lineAccounts } from '@line-saas/db';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class MessageHandler {
  private readonly logger = new Logger(MessageHandler.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

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
  }
}
