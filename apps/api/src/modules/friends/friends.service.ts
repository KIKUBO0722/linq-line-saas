import { Injectable, Inject, Logger, NotFoundException, InternalServerErrorException, HttpException } from '@nestjs/common';
import { eq, and, ilike, sql, desc } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { friends, friendTags, tags, lineAccounts, messages } from '@line-saas/db';

interface UpsertFriendDto {
  tenantId: string;
  lineAccountId: string;
  lineUserId: string;
  displayName?: string;
  pictureUrl?: string;
  statusMessage?: string;
  language?: string;
  isFollowing: boolean;
  followedAt?: Date;
  acquisitionSource?: string;
}

@Injectable()
export class FriendsService {
  private readonly logger = new Logger(FriendsService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findByLineUserId(lineAccountId: string, lineUserId: string) {
    const [friend] = await this.db
      .select()
      .from(friends)
      .where(
        and(eq(friends.lineAccountId, lineAccountId), eq(friends.lineUserId, lineUserId)),
      )
      .limit(1);
    return friend ?? null;
  }

  async upsertFriend(dto: UpsertFriendDto) {
    try {
      const existing = await this.db
        .select()
        .from(friends)
        .where(
          and(eq(friends.lineAccountId, dto.lineAccountId), eq(friends.lineUserId, dto.lineUserId)),
        )
        .limit(1);

      if (existing.length > 0) {
        const [updated] = await this.db
          .update(friends)
          .set({
            displayName: dto.displayName ?? existing[0].displayName,
            pictureUrl: dto.pictureUrl ?? existing[0].pictureUrl,
            statusMessage: dto.statusMessage ?? existing[0].statusMessage,
            language: dto.language ?? existing[0].language,
            isFollowing: dto.isFollowing,
            followedAt: dto.followedAt ?? existing[0].followedAt,
            unfollowedAt: null,
            profileSyncedAt: new Date(),
          })
          .where(eq(friends.id, existing[0].id))
          .returning();
        return updated ?? existing[0];
      }

      const [newFriend] = await this.db
        .insert(friends)
        .values({
          tenantId: dto.tenantId,
          lineAccountId: dto.lineAccountId,
          lineUserId: dto.lineUserId,
          displayName: dto.displayName,
          pictureUrl: dto.pictureUrl,
          statusMessage: dto.statusMessage,
          language: dto.language,
          isFollowing: dto.isFollowing,
          followedAt: dto.followedAt,
          acquisitionSource: dto.acquisitionSource,
          profileSyncedAt: new Date(),
        })
        .returning();

      return newFriend;
    } catch (error) {
      this.logger.error(`Failed to upsert friend: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async updateChatStatus(friendId: string, status: string, tenantId: string) {
    try {
      await this.findByIdOrThrow(friendId, tenantId);
      await this.db
        .update(friends)
        .set({ chatStatus: status })
        .where(and(eq(friends.id, friendId), eq(friends.tenantId, tenantId)));
    } catch (error) {
      this.logger.error(`Failed to update chat status for friend ${friendId}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async markUnfollowed(lineAccountId: string, lineUserId: string) {
    try {
      await this.db
        .update(friends)
        .set({ isFollowing: false, unfollowedAt: new Date() })
        .where(
          and(eq(friends.lineAccountId, lineAccountId), eq(friends.lineUserId, lineUserId)),
        );
    } catch (error) {
      this.logger.error(`Failed to mark unfollowed for user ${lineUserId}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async findByTenant(
    tenantId: string,
    options: { search?: string; page?: number; limit?: number } = {},
  ) {
    const { search, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    let query = this.db
      .select()
      .from(friends)
      .where(eq(friends.tenantId, tenantId))
      .limit(limit)
      .offset(offset)
      .orderBy(friends.createdAt);

    return query;
  }

  async findById(id: string, tenantId?: string) {
    const conditions = [eq(friends.id, id)];
    if (tenantId) conditions.push(eq(friends.tenantId, tenantId));
    const [friend] = await this.db.select().from(friends).where(and(...conditions)).limit(1);
    return friend;
  }

  async findByIdOrThrow(id: string, tenantId: string) {
    const friend = await this.findById(id, tenantId);
    if (!friend) throw new NotFoundException('友だちが見つかりません');
    return friend;
  }

  async updateScore(friendId: string, delta: number) {
    try {
      await this.db
        .update(friends)
        .set({ score: sql`${friends.score} + ${delta}` })
        .where(eq(friends.id, friendId));
    } catch (error) {
      this.logger.error(`Failed to update score for friend ${friendId}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async updateCustomFields(friendId: string, fields: Record<string, any>, tenantId: string) {
    try {
      const friend = await this.findByIdOrThrow(friendId, tenantId);
      const existing = (friend.customFields as Record<string, any>) || {};
      const merged = { ...existing, ...fields };
      // Remove keys explicitly set to null
      for (const key of Object.keys(merged)) {
        if (merged[key] === null) delete merged[key];
      }
      await this.db
        .update(friends)
        .set({ customFields: merged })
        .where(and(eq(friends.id, friendId), eq(friends.tenantId, tenantId)));
      return merged;
    } catch (error) {
      this.logger.error(`Failed to update custom fields for friend ${friendId}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async getCustomFieldDefinitions(tenantId: string) {
    try {
      // Get distinct keys from customFields across all friends for this tenant
      const result = await this.db
        .select({ customFields: friends.customFields })
        .from(friends)
        .where(eq(friends.tenantId, tenantId));
      const keys = new Set<string>();
      for (const row of result) {
        if (row.customFields && typeof row.customFields === 'object') {
          for (const key of Object.keys(row.customFields as Record<string, any>)) {
            keys.add(key);
          }
        }
      }
      return Array.from(keys);
    } catch (error) {
      this.logger.error(`Failed to get custom field definitions: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  /**
   * CSV Import — supports LinQ format and L Message (エルメ) format
   * LinQ format: 表示名,LINE ID,タグ,スコア,...
   * エルメ format: 表示名,LINE UID,タグ,...
   */
  async importFromCsv(
    tenantId: string,
    csvText: string,
    tagsService: { list(tenantId: string): Promise<{ id: string; name: string }[]>; create(tenantId: string, data: { name: string }): Promise<{ id: string }>; assignToFriend(friendId: string, tagId: string): Promise<void> },
  ): Promise<{ imported: number; updated: number; tagsCreated: number; errors: string[] }> {
    const lines = csvText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return { imported: 0, updated: 0, tagsCreated: 0, errors: ['CSVにデータ行がありません'] };

    // Parse header
    const header = this.parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
    const nameIdx = header.findIndex((h) => h.includes('表示名') || h.includes('name') || h.includes('displayname'));
    const lineIdIdx = header.findIndex((h) => h.includes('line id') || h.includes('uid') || h.includes('lineuserid') || h.includes('line_user_id'));
    const tagIdx = header.findIndex((h) => h.includes('タグ') || h.includes('tag'));
    const scoreIdx = header.findIndex((h) => h.includes('スコア') || h.includes('score'));

    if (lineIdIdx === -1 && nameIdx === -1) {
      return { imported: 0, updated: 0, tagsCreated: 0, errors: ['「表示名」または「LINE ID」列が見つかりません'] };
    }

    // Get first active account for this tenant
    const [account] = await this.db
      .select()
      .from(lineAccounts)
      .where(eq(lineAccounts.tenantId, tenantId))
      .limit(1);

    if (!account) return { imported: 0, updated: 0, tagsCreated: 0, errors: ['LINEアカウントが設定されていません'] };

    // Cache existing tags
    const existingTags = await tagsService.list(tenantId);
    const tagMap = new Map<string, string>();
    for (const t of existingTags) {
      tagMap.set(t.name.toLowerCase(), t.id);
    }

    let imported = 0;
    let updated = 0;
    let tagsCreated = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const cols = this.parseCsvLine(lines[i]);
        const displayName = nameIdx >= 0 ? cols[nameIdx]?.trim() : '';
        const lineUserId = lineIdIdx >= 0 ? cols[lineIdIdx]?.trim() : '';
        const tagStr = tagIdx >= 0 ? cols[tagIdx]?.trim() : '';
        const score = scoreIdx >= 0 ? parseInt(cols[scoreIdx]) || 0 : 0;

        if (!displayName && !lineUserId) {
          errors.push(`行${i + 1}: 表示名もLINE IDもありません`);
          continue;
        }

        // Upsert friend
        const friend = await this.upsertFriend({
          tenantId,
          lineAccountId: account.id,
          lineUserId: lineUserId || `import_${Date.now()}_${i}`,
          displayName: displayName || 'インポート',
          isFollowing: true,
          followedAt: new Date(),
          acquisitionSource: 'csv_import',
        });

        if (score > 0) {
          await this.updateScore(friend.id, score);
        }

        // Process tags (pipe-separated: タグA|タグB)
        if (tagStr) {
          const tagNames = tagStr.split('|').map((t) => t.trim()).filter(Boolean);
          for (const name of tagNames) {
            let tagId = tagMap.get(name.toLowerCase());
            if (!tagId) {
              const newTag = await tagsService.create(tenantId, { name });
              tagId = newTag.id;
              tagMap.set(name.toLowerCase(), tagId!);
              tagsCreated++;
            }
            if (tagId) await tagsService.assignToFriend(friend.id, tagId);
          }
        }

        // Check if it was new or existing
        if (friend.acquisitionSource === 'csv_import') {
          imported++;
        } else {
          updated++;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '処理エラー';
        errors.push(`行${i + 1}: ${message}`);
      }
    }

    return { imported, updated, tagsCreated, errors: errors.slice(0, 20) };
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  async getTimeline(tenantId: string, friendId: string, limit = 50, offset = 0) {
    try {
      // Get friend info for lifecycle events
      const [friend] = await this.db
        .select()
        .from(friends)
        .where(and(eq(friends.id, friendId), eq(friends.tenantId, tenantId)))
        .limit(1);

      if (!friend) return { events: [], total: 0 };

      // Get messages for this friend
      const msgRows = await this.db
        .select({
          id: messages.id,
          direction: messages.direction,
          messageType: messages.messageType,
          content: messages.content,
          status: messages.status,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(and(eq(messages.tenantId, tenantId), eq(messages.friendId, friendId)))
        .orderBy(desc(messages.createdAt))
        .limit(limit)
        .offset(offset);

      // Count total messages
      const [countResult] = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(messages)
        .where(and(eq(messages.tenantId, tenantId), eq(messages.friendId, friendId)));

      // Build timeline events
      type TimelineEvent = {
        id: string;
        type: string;
        timestamp: Date | null;
        data: Record<string, unknown> | null;
      };

      const events: TimelineEvent[] = msgRows.map((m) => ({
        id: m.id,
        type: m.direction === 'inbound' ? 'message_received' : 'message_sent',
        timestamp: m.createdAt,
        data: {
          messageType: m.messageType,
          content: m.content,
          status: m.status,
          direction: m.direction,
        },
      }));

      // Add lifecycle events (follow, unfollow) from friend record
      if (friend.followedAt) {
        events.push({
          id: `follow-${friend.id}`,
          type: 'followed',
          timestamp: friend.followedAt,
          data: null,
        });
      }
      if (friend.unfollowedAt) {
        events.push({
          id: `unfollow-${friend.id}`,
          type: 'unfollowed',
          timestamp: friend.unfollowedAt,
          data: null,
        });
      }

      const allEvents = events
        .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime());

      return {
        events: allEvents,
        total: (countResult?.count ?? 0) + (friend.followedAt ? 1 : 0) + (friend.unfollowedAt ? 1 : 0),
      };
    } catch (error) {
      this.logger.error(`Failed to get timeline for friend ${friendId}`, error);
      return { events: [], total: 0 };
    }
  }

  /** 友だちのエンゲージメントを即時active化（inbound message, follow, URL click時に呼ぶ） */
  async updateEngagement(friendId: string) {
    try {
      await this.db
        .update(friends)
        .set({ lastInteractionAt: new Date(), engagementTier: 'active' })
        .where(eq(friends.id, friendId));
    } catch (error) {
      this.logger.error(`Failed to update engagement for ${friendId}`, error);
    }
  }

  /** 全テナントのエンゲージメントティアを一括更新（CRONから呼ばれる） */
  async refreshAllTiers(): Promise<number> {
    try {
      const result = await this.db.execute(sql`
        UPDATE friends SET engagement_tier = CASE
          WHEN last_interaction_at >= NOW() - INTERVAL '7 days' THEN 'active'
          WHEN last_interaction_at >= NOW() - INTERVAL '30 days' THEN 'warm'
          WHEN last_interaction_at >= NOW() - INTERVAL '90 days' THEN 'cold'
          WHEN last_interaction_at IS NOT NULL THEN 'dormant'
          WHEN followed_at IS NOT NULL AND followed_at < NOW() - INTERVAL '90 days' THEN 'dormant'
          ELSE 'unknown'
        END
        WHERE is_following = true
          AND engagement_tier IS DISTINCT FROM CASE
            WHEN last_interaction_at >= NOW() - INTERVAL '7 days' THEN 'active'
            WHEN last_interaction_at >= NOW() - INTERVAL '30 days' THEN 'warm'
            WHEN last_interaction_at >= NOW() - INTERVAL '90 days' THEN 'cold'
            WHEN last_interaction_at IS NOT NULL THEN 'dormant'
            WHEN followed_at IS NOT NULL AND followed_at < NOW() - INTERVAL '90 days' THEN 'dormant'
            ELSE 'unknown'
          END
      `);
      return Number((result as unknown as { rowCount?: number })?.rowCount ?? 0);
    } catch (error) {
      this.logger.error('Failed to refresh engagement tiers', error);
      return 0;
    }
  }
}
