import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { tags, friendTags } from '@line-saas/db';

@Injectable()
export class TagsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async list(tenantId: string) {
    return this.db.select().from(tags).where(eq(tags.tenantId, tenantId)).orderBy(tags.name);
  }

  async create(tenantId: string, data: { name: string; color?: string }) {
    const [tag] = await this.db.insert(tags).values({ tenantId, ...data }).returning();
    return tag;
  }

  async update(id: string, data: { name?: string; color?: string }) {
    await this.db.update(tags).set(data).where(eq(tags.id, id));
  }

  async delete(id: string) {
    await this.db.delete(friendTags).where(eq(friendTags.tagId, id));
    await this.db.delete(tags).where(eq(tags.id, id));
  }

  async assignToFriend(friendId: string, tagId: string) {
    await this.db.insert(friendTags).values({ friendId, tagId }).onConflictDoNothing();
  }

  async removeFromFriend(friendId: string, tagId: string) {
    await this.db
      .delete(friendTags)
      .where(and(eq(friendTags.friendId, friendId), eq(friendTags.tagId, tagId)));
  }

  async listForFriend(friendId: string) {
    const rows = await this.db
      .select({ tag: tags })
      .from(friendTags)
      .innerJoin(tags, eq(friendTags.tagId, tags.id))
      .where(eq(friendTags.friendId, friendId));
    return rows.map((r) => r.tag);
  }
}
