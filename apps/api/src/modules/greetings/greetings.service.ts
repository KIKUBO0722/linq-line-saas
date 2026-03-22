import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { greetingMessages } from '@line-saas/db';

@Injectable()
export class GreetingsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async list(tenantId: string) {
    return this.db
      .select()
      .from(greetingMessages)
      .where(eq(greetingMessages.tenantId, tenantId))
      .orderBy(desc(greetingMessages.createdAt));
  }

  async getByType(tenantId: string, type: string) {
    const [greeting] = await this.db
      .select()
      .from(greetingMessages)
      .where(
        and(
          eq(greetingMessages.tenantId, tenantId),
          eq(greetingMessages.type, type),
          eq(greetingMessages.isActive, true),
        ),
      )
      .orderBy(desc(greetingMessages.createdAt))
      .limit(1);
    return greeting ?? null;
  }

  async create(
    tenantId: string,
    data: {
      type: string;
      name: string;
      messages: Record<string, unknown>[];
      isActive?: boolean;
    },
  ) {
    const [greeting] = await this.db
      .insert(greetingMessages)
      .values({
        tenantId,
        type: data.type,
        name: data.name,
        messages: data.messages,
        isActive: data.isActive ?? true,
      })
      .returning();
    return greeting;
  }

  async update(
    id: string,
    tenantId: string,
    data: {
      name?: string;
      messages?: Record<string, unknown>[];
      isActive?: boolean;
    },
  ) {
    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) values.name = data.name;
    if (data.messages !== undefined) values.messages = data.messages;
    if (data.isActive !== undefined) values.isActive = data.isActive;

    const [updated] = await this.db
      .update(greetingMessages)
      .set(values)
      .where(
        and(
          eq(greetingMessages.id, id),
          eq(greetingMessages.tenantId, tenantId),
        ),
      )
      .returning();
    return updated;
  }

  async delete(id: string, tenantId: string) {
    await this.db
      .delete(greetingMessages)
      .where(
        and(
          eq(greetingMessages.id, id),
          eq(greetingMessages.tenantId, tenantId),
        ),
      );
  }
}
