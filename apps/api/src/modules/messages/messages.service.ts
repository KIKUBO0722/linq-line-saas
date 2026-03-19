import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { messages, friends, lineAccounts } from '@line-saas/db';
import { LineService } from '../line/line.service';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly lineService: LineService,
  ) {}

  async getConversation(tenantId: string, friendId: string) {
    return this.db
      .select()
      .from(messages)
      .where(and(eq(messages.tenantId, tenantId), eq(messages.friendId, friendId)))
      .orderBy(desc(messages.createdAt))
      .limit(100);
  }

  async sendToFriend(tenantId: string, friendId: string, text: string) {
    const [friend] = await this.db
      .select()
      .from(friends)
      .where(and(eq(friends.tenantId, tenantId), eq(friends.id, friendId)))
      .limit(1);

    if (!friend) throw new Error('Friend not found');

    const [account] = await this.db
      .select()
      .from(lineAccounts)
      .where(eq(lineAccounts.id, friend.lineAccountId))
      .limit(1);

    if (!account) throw new Error('LINE account not found');

    await this.lineService.pushMessage(
      { channelSecret: account.channelSecret, channelAccessToken: account.channelAccessToken },
      friend.lineUserId,
      [{ type: 'text', text }],
    );

    const [msg] = await this.db
      .insert(messages)
      .values({
        tenantId,
        lineAccountId: account.id,
        friendId,
        direction: 'outbound',
        messageType: 'text',
        content: { type: 'text', text },
        sendType: 'push',
        status: 'sent',
        sentAt: new Date(),
      })
      .returning();

    return msg;
  }

  async broadcast(tenantId: string, text: string) {
    const accounts = await this.db
      .select()
      .from(lineAccounts)
      .where(and(eq(lineAccounts.tenantId, tenantId), eq(lineAccounts.isActive, true)));

    for (const account of accounts) {
      await this.lineService.broadcast(
        { channelSecret: account.channelSecret, channelAccessToken: account.channelAccessToken },
        [{ type: 'text', text }],
      );

      await this.db.insert(messages).values({
        tenantId,
        lineAccountId: account.id,
        direction: 'outbound',
        messageType: 'text',
        content: { type: 'text', text },
        sendType: 'broadcast',
        status: 'sent',
        sentAt: new Date(),
      });
    }

    return { sent: accounts.length };
  }
}
