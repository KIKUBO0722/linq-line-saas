import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { forms, formResponses } from '@line-saas/db';

@Injectable()
export class FormsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async create(tenantId: string, data: { name: string; description?: string; fields: any[]; thankYouMessage?: string }) {
    const [form] = await this.db.insert(forms).values({ tenantId, ...data }).returning();
    return form;
  }

  async list(tenantId: string) {
    return this.db.select().from(forms).where(eq(forms.tenantId, tenantId)).orderBy(forms.createdAt);
  }

  async getById(id: string) {
    const [form] = await this.db.select().from(forms).where(eq(forms.id, id)).limit(1);
    if (!form) throw new NotFoundException('Form not found');
    return form;
  }

  async update(id: string, data: Partial<typeof forms.$inferInsert>) {
    await this.db.update(forms).set(data).where(eq(forms.id, id));
  }

  async delete(id: string) {
    await this.db.delete(forms).where(eq(forms.id, id));
  }

  async submitResponse(formId: string, friendId: string | null, answers: any) {
    const [response] = await this.db.insert(formResponses).values({ formId, friendId, answers }).returning();
    return response;
  }

  async getResponses(formId: string) {
    return this.db.select().from(formResponses).where(eq(formResponses.formId, formId)).orderBy(formResponses.submittedAt);
  }
}
