import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, ilike, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { friends, friendTags, tags } from '@line-saas/db';

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
}

@Injectable()
export class FriendsService {
  private readonly logger = new Logger(FriendsService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async upsertFriend(dto: UpsertFriendDto) {
    const existing = await this.db
      .select()
      .from(friends)
      .where(
        and(eq(friends.lineAccountId, dto.lineAccountId), eq(friends.lineUserId, dto.lineUserId)),
      )
      .limit(1);

    if (existing.length > 0) {
      await this.db
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
        .where(eq(friends.id, existing[0].id));
      return existing[0];
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
        profileSyncedAt: new Date(),
      })
      .returning();

    return newFriend;
  }

  async markUnfollowed(lineAccountId: string, lineUserId: string) {
    await this.db
      .update(friends)
      .set({ isFollowing: false, unfollowedAt: new Date() })
      .where(
        and(eq(friends.lineAccountId, lineAccountId), eq(friends.lineUserId, lineUserId)),
      );
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

  async findById(id: string) {
    const [friend] = await this.db.select().from(friends).where(eq(friends.id, id)).limit(1);
    return friend;
  }
}
