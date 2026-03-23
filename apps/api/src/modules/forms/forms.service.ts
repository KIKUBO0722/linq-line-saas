import { Injectable, Inject, NotFoundException, Logger, InternalServerErrorException, HttpException } from '@nestjs/common';
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
    try {
      const [form] = await this.db.insert(forms).values({ tenantId, ...data }).returning();
      return form;
    } catch (error) {
      this.logger.error(`Failed to create form: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async list(tenantId: string) {
    try {
      return await this.db.select().from(forms).where(eq(forms.tenantId, tenantId)).orderBy(forms.createdAt);
    } catch (error) {
      this.logger.error(`Failed to list forms: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async getById(id: string) {
    const [form] = await this.db.select().from(forms).where(eq(forms.id, id)).limit(1);
    if (!form) throw new NotFoundException('Form not found');
    return form;
  }

  async update(id: string, data: Partial<typeof forms.$inferInsert>) {
    try {
      await this.db.update(forms).set(data).where(eq(forms.id, id));
    } catch (error) {
      this.logger.error(`Failed to update form ${id}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async delete(id: string) {
    try {
      await this.db.delete(forms).where(eq(forms.id, id));
    } catch (error) {
      this.logger.error(`Failed to delete form ${id}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async submitResponse(formId: string, friendId: string | null, answers: Record<string, unknown>) {
    try {
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
    } catch (error) {
      this.logger.error(`Failed to submit form response for form ${formId}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async getResponses(formId: string) {
    try {
      return await this.db.select().from(formResponses).where(eq(formResponses.formId, formId)).orderBy(formResponses.submittedAt);
    } catch (error) {
      this.logger.error(`Failed to get responses for form ${formId}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }
}
