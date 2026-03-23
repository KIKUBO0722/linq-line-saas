import { Injectable, Inject, NotFoundException, Logger, InternalServerErrorException, HttpException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { tags, friendTags } from '@line-saas/db';

@Injectable()
export class TagsService {
  private readonly logger = new Logger(TagsService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async list(tenantId: string) {
    return this.db.select().from(tags).where(eq(tags.tenantId, tenantId)).orderBy(tags.name);
  }

  async create(tenantId: string, data: { name: string; color?: string }) {
    try {
      const [tag] = await this.db.insert(tags).values({ tenantId, ...data }).returning();
      return tag;
    } catch (error) {
      this.logger.error(`Failed to create tag: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async verifyOwnership(tagId: string, tenantId: string) {
    const [tag] = await this.db
      .select()
      .from(tags)
      .where(and(eq(tags.id, tagId), eq(tags.tenantId, tenantId)))
      .limit(1);
    if (!tag) throw new NotFoundException('タグが見つかりません');
    return tag;
  }

  async update(id: string, data: { name?: string; color?: string }, tenantId: string) {
    try {
      await this.verifyOwnership(id, tenantId);
      await this.db.update(tags).set(data).where(and(eq(tags.id, id), eq(tags.tenantId, tenantId)));
    } catch (error) {
      this.logger.error(`Failed to update tag ${id}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async delete(id: string, tenantId: string) {
    try {
      await this.verifyOwnership(id, tenantId);
      await this.db.delete(friendTags).where(eq(friendTags.tagId, id));
      await this.db.delete(tags).where(and(eq(tags.id, id), eq(tags.tenantId, tenantId)));
    } catch (error) {
      this.logger.error(`Failed to delete tag ${id}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async assignToFriend(friendId: string, tagId: string) {
    try {
      await this.db.insert(friendTags).values({ friendId, tagId }).onConflictDoNothing();
    } catch (error) {
      this.logger.error(`Failed to assign tag ${tagId} to friend ${friendId}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async removeFromFriend(friendId: string, tagId: string) {
    try {
      await this.db
        .delete(friendTags)
        .where(and(eq(friendTags.friendId, friendId), eq(friendTags.tagId, tagId)));
    } catch (error) {
      this.logger.error(`Failed to remove tag ${tagId} from friend ${friendId}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async listForFriend(friendId: string) {
    try {
      const rows = await this.db
        .select({ tag: tags })
        .from(friendTags)
        .innerJoin(tags, eq(friendTags.tagId, tags.id))
        .where(eq(friendTags.friendId, friendId));
      return rows.map((r) => r.tag);
    } catch (error) {
      this.logger.error(`Failed to list tags for friend ${friendId}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }
}
