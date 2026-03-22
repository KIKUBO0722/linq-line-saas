import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, desc, gt, lte, isNotNull, sql, count, max } from 'drizzle-orm';
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

  /**
   * Mark a friend's messages as read by updating lastReadAt.
   */
  async markAsRead(tenantId: string, friendId: string) {
    await this.db
      .update(friends)
      .set({ lastReadAt: new Date() })
      .where(and(eq(friends.id, friendId), eq(friends.tenantId, tenantId)));
  }

  /**
   * Get unread summary: count inbound messages after lastReadAt per friend.
   * Uses a single aggregation query instead of N+1 individual queries.
   */
  async getUnreadSummary(tenantId: string) {
    // Single query: join messages with friends, filter unread inbound, group by friend
    const rows = await this.db
      .select({
        friendId: messages.friendId,
        unreadCount: count(messages.id).as('unread_count'),
        lastMessageContent: sql<string>`(
          SELECT m2.content FROM messages m2
          WHERE m2.friend_id = ${messages.friendId}
            AND m2.tenant_id = ${tenantId}
            AND m2.direction = 'inbound'
            AND (${friends.lastReadAt} IS NULL OR m2.created_at > ${friends.lastReadAt})
          ORDER BY m2.created_at DESC LIMIT 1
        )`.as('last_message_content'),
        lastMessageCreatedAt: max(messages.createdAt).as('last_message_created_at'),
      })
      .from(messages)
      .innerJoin(friends, eq(messages.friendId, friends.id))
      .where(
        and(
          eq(messages.tenantId, tenantId),
          eq(messages.direction, 'inbound'),
          sql`(${friends.lastReadAt} IS NULL OR ${messages.createdAt} > ${friends.lastReadAt})`,
        ),
      )
      .groupBy(messages.friendId, friends.lastReadAt);

    let totalUnread = 0;
    const unreadFriends: Array<{ friendId: string; unreadCount: number; lastMessage: any; createdAt: string }> = [];

    for (const row of rows) {
      if (!row.friendId) continue;
      const cnt = Number(row.unreadCount);
      totalUnread += cnt;

      let lastMessage: any = null;
      try {
        lastMessage = typeof row.lastMessageContent === 'string'
          ? JSON.parse(row.lastMessageContent)
          : row.lastMessageContent;
      } catch {
        lastMessage = row.lastMessageContent;
      }

      unreadFriends.push({
        friendId: row.friendId,
        unreadCount: cnt,
        lastMessage,
        createdAt: row.lastMessageCreatedAt?.toISOString() || '',
      });
    }

    return { totalUnread, unreadFriends };
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

  async sendMessageToFriend(
    tenantId: string,
    friendId: string,
    message: {
      type: 'text' | 'image' | 'video' | 'audio' | 'flex';
      text?: string;
      originalContentUrl?: string;
      previewImageUrl?: string;
      duration?: number;
      altText?: string;
      contents?: any;
      quickReply?: {
        items: Array<{
          type: 'action';
          action: { type: string; label: string; text?: string; uri?: string; data?: string };
        }>;
      };
    },
  ) {
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

    let lineMessage: any;
    switch (message.type) {
      case 'text':
        lineMessage = { type: 'text', text: message.text };
        break;
      case 'image':
        lineMessage = {
          type: 'image',
          originalContentUrl: message.originalContentUrl,
          previewImageUrl: message.previewImageUrl || message.originalContentUrl,
        };
        break;
      case 'video':
        lineMessage = {
          type: 'video',
          originalContentUrl: message.originalContentUrl,
          previewImageUrl: message.previewImageUrl,
        };
        break;
      case 'audio':
        lineMessage = {
          type: 'audio',
          originalContentUrl: message.originalContentUrl,
          duration: message.duration || 60000,
        };
        break;
      case 'flex':
        lineMessage = {
          type: 'flex',
          altText: message.altText || 'メッセージ',
          contents: message.contents,
        };
        break;
      default:
        throw new Error(`Unsupported message type: ${message.type}`);
    }

    // Attach quickReply if provided
    if (message.quickReply && message.quickReply.items && message.quickReply.items.length > 0) {
      lineMessage.quickReply = message.quickReply;
    }

    await this.lineService.pushMessage(
      { channelSecret: account.channelSecret, channelAccessToken: account.channelAccessToken },
      friend.lineUserId,
      [lineMessage],
    );

    const [msg] = await this.db
      .insert(messages)
      .values({
        tenantId,
        lineAccountId: account.id,
        friendId,
        direction: 'outbound',
        messageType: message.type,
        content: lineMessage,
        sendType: 'push',
        status: 'sent',
        sentAt: new Date(),
      })
      .returning();

    return msg;
  }

  async broadcastMessage(
    tenantId: string,
    message: {
      type: 'text' | 'image' | 'video' | 'audio' | 'flex';
      text?: string;
      originalContentUrl?: string;
      previewImageUrl?: string;
      duration?: number;
      altText?: string;
      contents?: any;
      quickReply?: {
        items: Array<{
          type: 'action';
          action: { type: string; label: string; text?: string; uri?: string; data?: string };
        }>;
      };
    },
  ) {
    const accounts = await this.db
      .select()
      .from(lineAccounts)
      .where(and(eq(lineAccounts.tenantId, tenantId), eq(lineAccounts.isActive, true)));

    let lineMessage: any;
    switch (message.type) {
      case 'text':
        lineMessage = { type: 'text', text: message.text };
        break;
      case 'image':
        lineMessage = {
          type: 'image',
          originalContentUrl: message.originalContentUrl,
          previewImageUrl: message.previewImageUrl || message.originalContentUrl,
        };
        break;
      case 'video':
        lineMessage = {
          type: 'video',
          originalContentUrl: message.originalContentUrl,
          previewImageUrl: message.previewImageUrl,
        };
        break;
      case 'audio':
        lineMessage = {
          type: 'audio',
          originalContentUrl: message.originalContentUrl,
          duration: message.duration || 60000,
        };
        break;
      case 'flex':
        lineMessage = {
          type: 'flex',
          altText: message.altText || 'メッセージ',
          contents: message.contents,
        };
        break;
      default:
        throw new Error(`Unsupported message type: ${message.type}`);
    }

    // Attach quickReply if provided
    if (message.quickReply && message.quickReply.items && message.quickReply.items.length > 0) {
      lineMessage.quickReply = message.quickReply;
    }

    for (const account of accounts) {
      await this.lineService.broadcast(
        { channelSecret: account.channelSecret, channelAccessToken: account.channelAccessToken },
        [lineMessage],
      );

      await this.db.insert(messages).values({
        tenantId,
        lineAccountId: account.id,
        direction: 'outbound',
        messageType: message.type,
        content: lineMessage,
        sendType: 'broadcast',
        status: 'sent',
        sentAt: new Date(),
      });
    }

    return { sent: accounts.length };
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

  async scheduleBroadcast(tenantId: string, text: string, scheduledAt: Date) {
    const accounts = await this.db
      .select()
      .from(lineAccounts)
      .where(and(eq(lineAccounts.tenantId, tenantId), eq(lineAccounts.isActive, true)));

    for (const account of accounts) {
      await this.db.insert(messages).values({
        tenantId,
        lineAccountId: account.id,
        direction: 'outbound',
        messageType: 'text',
        content: { type: 'text', text },
        sendType: 'broadcast',
        status: 'scheduled',
        scheduledAt,
      });
    }

    return { scheduled: accounts.length, scheduledAt: scheduledAt.toISOString() };
  }

  async processDueBroadcasts(): Promise<{ processed: number }> {
    const now = new Date();
    const dueMessages = await this.db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.status, 'scheduled'),
          eq(messages.sendType, 'broadcast'),
          isNotNull(messages.scheduledAt),
          lte(messages.scheduledAt, now),
        ),
      );

    let processed = 0;

    for (const msg of dueMessages) {
      try {
        const [account] = await this.db
          .select()
          .from(lineAccounts)
          .where(eq(lineAccounts.id, msg.lineAccountId))
          .limit(1);

        if (!account) {
          this.logger.warn(`LINE account not found for scheduled message ${msg.id}`);
          await this.db
            .update(messages)
            .set({ status: 'failed', error: { message: 'LINE account not found' } })
            .where(eq(messages.id, msg.id));
          continue;
        }

        const content = msg.content as { type: string; text: string };
        await this.lineService.broadcast(
          { channelSecret: account.channelSecret, channelAccessToken: account.channelAccessToken },
          [{ type: 'text', text: content.text }],
        );

        await this.db
          .update(messages)
          .set({ status: 'sent', sentAt: new Date() })
          .where(eq(messages.id, msg.id));

        processed++;
      } catch (error: any) {
        this.logger.error(`Failed to send scheduled message ${msg.id}:`, error);
        await this.db
          .update(messages)
          .set({ status: 'failed', error: { message: error.message || 'Unknown error' } })
          .where(eq(messages.id, msg.id));
      }
    }

    return { processed };
  }

  async testSend(tenantId: string, friendIds: string[], text: string) {
    const accounts = await this.db
      .select()
      .from(lineAccounts)
      .where(and(eq(lineAccounts.tenantId, tenantId), eq(lineAccounts.isActive, true)));

    if (accounts.length === 0) return { sent: 0 };

    const account = accounts[0];
    const credentials = {
      channelSecret: account.channelSecret,
      channelAccessToken: account.channelAccessToken,
    };

    let sent = 0;
    for (const friendId of friendIds) {
      const [friend] = await this.db
        .select()
        .from(friends)
        .where(and(eq(friends.id, friendId), eq(friends.tenantId, tenantId)))
        .limit(1);
      if (!friend?.lineUserId) continue;

      try {
        await this.lineService.pushMessage(credentials, friend.lineUserId, [
          { type: 'text', text },
        ]);
        sent++;
      } catch (error: any) {
        this.logger.error(`Test send failed for ${friendId}: ${error.message}`);
      }
    }

    return { sent };
  }
}
