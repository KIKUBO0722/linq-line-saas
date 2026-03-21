import { Injectable, Inject } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { messageTemplates } from '@line-saas/db';

@Injectable()
export class TemplatesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async list(tenantId: string) {
    return this.db
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.tenantId, tenantId))
      .orderBy(desc(messageTemplates.updatedAt));
  }

  async create(tenantId: string, data: { name: string; content: string; category?: string }) {
    const [template] = await this.db
      .insert(messageTemplates)
      .values({ tenantId, ...data })
      .returning();
    return template;
  }

  async update(id: string, data: { name?: string; content?: string; category?: string }) {
    const [template] = await this.db
      .update(messageTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(messageTemplates.id, id))
      .returning();
    return template;
  }

  async delete(id: string) {
    await this.db.delete(messageTemplates).where(eq(messageTemplates.id, id));
  }

  /**
   * Convert a stored template to LINE message format.
   * Content may be plain text (legacy) or a JSON structure for buttons/confirm/carousel.
   */
  convertToLineMessage(template: any): any {
    const data =
      typeof template.content === 'string'
        ? (() => {
            try {
              return JSON.parse(template.content);
            } catch {
              // Legacy plain text template
              return { type: 'text', text: template.content };
            }
          })()
        : template.content;
    return data;
  }
}
