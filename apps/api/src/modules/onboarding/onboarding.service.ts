import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { tenants, tags, greetingMessages, stepScenarios, stepMessages, aiConfigs } from '@line-saas/db';
import { INDUSTRY_TEMPLATES, type IndustryTemplate } from './industry-templates';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  getTemplates() {
    return INDUSTRY_TEMPLATES.map(({ id, name, description, icon }) => ({ id, name, description, icon }));
  }

  async applyTemplate(tenantId: string, industryId: string) {
    const template = INDUSTRY_TEMPLATES.find((t) => t.id === industryId);
    if (!template) {
      throw new BadRequestException('指定された業種テンプレートが見つかりません');
    }

    try {
      // Update tenant industry
      await this.db
        .update(tenants)
        .set({ industry: template.name, updatedAt: new Date() })
        .where(eq(tenants.id, tenantId));

      // Create tags
      const createdTags: string[] = [];
      for (const tag of template.tags) {
        try {
          const [created] = await this.db
            .insert(tags)
            .values({ tenantId, name: tag.name, color: tag.color })
            .returning();
          createdTags.push(created.id);
        } catch {
          // Tag might already exist, skip
        }
      }

      // Create greeting messages
      await this.db.insert(greetingMessages).values({
        tenantId,
        type: 'new_follow',
        name: `${template.name}新規あいさつ`,
        messages: [{ type: 'text', text: template.greetings.newFollow }],
        isActive: true,
      }).onConflictDoNothing();

      await this.db.insert(greetingMessages).values({
        tenantId,
        type: 're_follow',
        name: `${template.name}再フォローあいさつ`,
        messages: [{ type: 'text', text: template.greetings.reFollow }],
        isActive: true,
      }).onConflictDoNothing();

      // Create step scenario
      const [scenario] = await this.db
        .insert(stepScenarios)
        .values({
          tenantId,
          name: template.stepScenario.name,
          description: template.stepScenario.description,
          triggerType: 'manual',
          isActive: false,
        })
        .returning();

      // Create step messages
      for (let i = 0; i < template.stepScenario.messages.length; i++) {
        const msg = template.stepScenario.messages[i];
        await this.db.insert(stepMessages).values({
          scenarioId: scenario.id,
          delayMinutes: msg.delayMinutes,
          messageContent: { type: 'text', text: msg.text },
          sortOrder: i + 1,
        });
      }

      // Update AI config
      const [existingConfig] = await this.db
        .select()
        .from(aiConfigs)
        .where(eq(aiConfigs.tenantId, tenantId))
        .limit(1);

      if (existingConfig) {
        await this.db
          .update(aiConfigs)
          .set({ systemPrompt: template.aiPrompt })
          .where(eq(aiConfigs.tenantId, tenantId));
      } else {
        await this.db.insert(aiConfigs).values({
          tenantId,
          systemPrompt: template.aiPrompt,
          autoReplyEnabled: true,
        });
      }

      this.logger.log(`Applied industry template "${template.name}" to tenant ${tenantId}`);

      return {
        success: true,
        industry: template.name,
        tagsCreated: createdTags.length,
        scenarioCreated: scenario.name,
      };
    } catch (error) {
      this.logger.error(`Failed to apply template for tenant ${tenantId}`, error);
      throw error;
    }
  }
}
