import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, inArray, and, notInArray, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { segments, segmentBroadcasts, friends, friendTags, lineAccounts, messages } from '@line-saas/db';
import { LineService } from '../line/line.service';

@Injectable()
export class SegmentsService {
  private readonly logger = new Logger(SegmentsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly lineService: LineService,
  ) {}

  async list(tenantId: string) {
    return this.db.select().from(segments).where(eq(segments.tenantId, tenantId)).orderBy(segments.createdAt);
  }

  async create(tenantId: string, data: { name: string; description?: string; tagIds: string[]; matchType?: string; excludeTagIds?: string[] }) {
    const [segment] = await this.db
      .insert(segments)
      .values({
        tenantId,
        name: data.name,
        description: data.description,
        tagIds: data.tagIds,
        matchType: data.matchType || 'any',
        excludeTagIds: data.excludeTagIds || [],
      })
      .returning();
    return segment;
  }

  async delete(id: string) {
    await this.db.delete(segments).where(eq(segments.id, id));
  }

  async getMatchingFriends(tenantId: string, tagIds: string[], matchType: string = 'any', excludeTagIds: string[] = []) {
    if (!tagIds.length) return [];

    let rows: any[];

    if (matchType === 'all') {
      // AND logic: friend must have ALL specified tags
      rows = await this.db
        .select({
          id: friends.id,
          displayName: friends.displayName,
          lineUserId: friends.lineUserId,
          lineAccountId: friends.lineAccountId,
        })
        .from(friends)
        .innerJoin(friendTags, eq(friends.id, friendTags.friendId))
        .where(and(eq(friends.tenantId, tenantId), eq(friends.isFollowing, true), inArray(friendTags.tagId, tagIds)))
        .groupBy(friends.id, friends.displayName, friends.lineUserId, friends.lineAccountId)
        .having(sql`count(distinct ${friendTags.tagId}) = ${tagIds.length}`);
    } else {
      // OR logic: friend must have ANY of the specified tags
      rows = await this.db
        .selectDistinct({
          id: friends.id,
          displayName: friends.displayName,
          lineUserId: friends.lineUserId,
          lineAccountId: friends.lineAccountId,
        })
        .from(friends)
        .innerJoin(friendTags, eq(friends.id, friendTags.friendId))
        .where(and(eq(friends.tenantId, tenantId), eq(friends.isFollowing, true), inArray(friendTags.tagId, tagIds)));
    }

    // Exclude friends who have any of the exclude tags
    if (excludeTagIds.length > 0) {
      const excludedFriendRows = await this.db
        .selectDistinct({ friendId: friendTags.friendId })
        .from(friendTags)
        .where(inArray(friendTags.tagId, excludeTagIds));

      const excludedIds = new Set(excludedFriendRows.map((r) => r.friendId));
      rows = rows.filter((r) => !excludedIds.has(r.id));
    }

    return rows;
  }

  async broadcast(tenantId: string, segmentId: string, message: string) {
    const [segment] = await this.db.select().from(segments).where(eq(segments.id, segmentId));
    if (!segment) throw new Error('Segment not found');

    const matchingFriends = await this.getMatchingFriends(
      tenantId,
      segment.tagIds,
      segment.matchType,
      segment.excludeTagIds,
    );

    const [broadcastRecord] = await this.db
      .insert(segmentBroadcasts)
      .values({
        segmentId,
        message,
        recipientCount: matchingFriends.length,
      })
      .returning();

    // Send LINE messages grouped by account
    const byAccount = new Map<string, { lineUserId: string; friendId: string }[]>();
    for (const f of matchingFriends) {
      if (!f.lineAccountId || !f.lineUserId) continue;
      const list = byAccount.get(f.lineAccountId) || [];
      list.push({ lineUserId: f.lineUserId, friendId: f.id });
      byAccount.set(f.lineAccountId, list);
    }

    let sentCount = 0;
    for (const [accountId, recipients] of byAccount) {
      const [account] = await this.db
        .select()
        .from(lineAccounts)
        .where(eq(lineAccounts.id, accountId))
        .limit(1);

      if (!account) continue;

      const credentials = {
        channelSecret: account.channelSecret,
        channelAccessToken: account.channelAccessToken,
      };
      const userIds = recipients.map((r) => r.lineUserId);

      try {
        await this.lineService.multicast(credentials, userIds, [{ type: 'text', text: message }]);

        // Record individual messages
        const messageRows = recipients.map((r) => ({
          tenantId,
          lineAccountId: accountId,
          friendId: r.friendId,
          direction: 'outbound' as const,
          messageType: 'text',
          content: { text: message },
          sendType: 'broadcast' as const,
          status: 'sent' as const,
          sentAt: new Date(),
        }));
        if (messageRows.length > 0) {
          await this.db.insert(messages).values(messageRows);
        }
        sentCount += recipients.length;
      } catch (error) {
        this.logger.error(`Failed to multicast to account ${accountId}: ${error}`);
      }
    }

    return { broadcast: broadcastRecord, recipientCount: matchingFriends.length, sentCount };
  }
}
