import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { forms, formResponses, friendTags } from '@line-saas/db';
import { FriendsService } from '../friends/friends.service';

@Injectable()
export class FormsService {
  private readonly logger = new Logger(FormsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly friendsService: FriendsService,
  ) {}

  async create(tenantId: string, data: { name: string; description?: string; fields: Record<string, unknown>[]; thankYouMessage?: string; tagOnSubmitId?: string }) {
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

  async submitResponse(formId: string, friendId: string | null, answers: Record<string, unknown>) {
    const [response] = await this.db.insert(formResponses).values({ formId, friendId, answers }).returning();

    // Update engagement score (+5 for form submission)
    if (friendId) {
      await this.friendsService.updateScore(friendId, 5);
    }

    // Auto-tag: assign tag to friend if form has tagOnSubmitId
    if (friendId) {
      try {
        const [form] = await this.db.select().from(forms).where(eq(forms.id, formId)).limit(1);
        if (form?.tagOnSubmitId) {
          await this.db
            .insert(friendTags)
            .values({ friendId, tagId: form.tagOnSubmitId })
            .onConflictDoNothing();
          this.logger.log(`Auto-tagged friend ${friendId} with tag ${form.tagOnSubmitId} from form ${formId}`);
        }
      } catch (err) {
        this.logger.warn(`Failed to auto-tag friend on form submit: ${err}`);
      }
    }

    return response;
  }

  async getResponses(formId: string) {
    return this.db.select().from(formResponses).where(eq(formResponses.formId, formId)).orderBy(formResponses.submittedAt);
  }
}
