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

  async create(
    tenantId: string,
    data: { name: string; content: string; category?: string; messageType?: string; messageData?: any },
  ) {
    const [template] = await this.db
      .insert(messageTemplates)
      .values({
        tenantId,
        name: data.name,
        content: data.content,
        category: data.category,
        messageType: data.messageType || 'text',
        messageData: data.messageData || null,
      })
      .returning();
    return template;
  }

  async update(
    id: string,
    data: { name?: string; content?: string; category?: string; messageType?: string; messageData?: any },
  ) {
    const values: any = { updatedAt: new Date() };
    if (data.name !== undefined) values.name = data.name;
    if (data.content !== undefined) values.content = data.content;
    if (data.category !== undefined) values.category = data.category;
    if (data.messageType !== undefined) values.messageType = data.messageType;
    if (data.messageData !== undefined) values.messageData = data.messageData;

    const [template] = await this.db
      .update(messageTemplates)
      .set(values)
      .where(eq(messageTemplates.id, id))
      .returning();
    return template;
  }

  async delete(id: string) {
    await this.db.delete(messageTemplates).where(eq(messageTemplates.id, id));
  }

  /**
   * Convert a stored template to LINE message format.
   */
  convertToLineMessage(template: any): any {
    const type = template.messageType || 'text';
    const data = template.messageData;

    if (type === 'text' || !data) {
      return { type: 'text', text: template.content };
    }

    if (type === 'buttons') {
      return {
        type: 'template',
        altText: template.content || template.name,
        template: {
          type: 'buttons',
          thumbnailImageUrl: data.thumbnailUrl || undefined,
          title: data.title || undefined,
          text: data.text || template.content,
          actions: (data.actions || []).map(this.convertAction),
        },
      };
    }

    if (type === 'carousel') {
      return {
        type: 'template',
        altText: template.content || template.name,
        template: {
          type: 'carousel',
          columns: (data.columns || []).map((col: any) => ({
            thumbnailImageUrl: col.thumbnailUrl || undefined,
            title: col.title || undefined,
            text: col.text || '',
            actions: (col.actions || []).map(this.convertAction),
          })),
        },
      };
    }

    if (type === 'confirm') {
      return {
        type: 'template',
        altText: template.content || template.name,
        template: {
          type: 'confirm',
          text: data.text || template.content,
          actions: (data.actions || []).map(this.convertAction),
        },
      };
    }

    if (type === 'image') {
      return {
        type: 'image',
        originalContentUrl: data.imageUrl || '',
        previewImageUrl: data.previewUrl || data.imageUrl || '',
      };
    }

    if (type === 'flex') {
      try {
        return {
          type: 'flex',
          altText: template.content || template.name,
          contents: typeof data === 'string' ? JSON.parse(data) : data,
        };
      } catch {
        return { type: 'text', text: template.content };
      }
    }

    return { type: 'text', text: template.content };
  }

  private convertAction(action: any) {
    if (action.type === 'uri') {
      return { type: 'uri', label: action.label || 'リンク', uri: action.uri || '' };
    }
    if (action.type === 'message') {
      return { type: 'message', label: action.label || '送信', text: action.text || '' };
    }
    if (action.type === 'postback') {
      return { type: 'postback', label: action.label || 'アクション', data: action.data || '' };
    }
    return { type: 'message', label: action.label || '', text: action.text || '' };
  }
}
