import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, lte } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import {
  stepScenarios,
  stepMessages,
  stepEnrollments,
  friends,
  friendTags,
  messages,
  lineAccounts,
} from '@line-saas/db';
import { LineService } from '../line/line.service';

@Injectable()
export class StepsService {
  private readonly logger = new Logger(StepsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly lineService: LineService,
  ) {}

  // Scenario CRUD
  async createScenario(
    tenantId: string,
    data: { name: string; description?: string; triggerType: string; triggerConfig?: Record<string, unknown> },
  ) {
    const [scenario] = await this.db
      .insert(stepScenarios)
      .values({ tenantId, ...data })
      .returning();
    return scenario;
  }

  async listScenarios(tenantId: string) {
    return this.db
      .select()
      .from(stepScenarios)
      .where(eq(stepScenarios.tenantId, tenantId))
      .orderBy(stepScenarios.createdAt);
  }

  async getScenario(id: string) {
    const [scenario] = await this.db
      .select()
      .from(stepScenarios)
      .where(eq(stepScenarios.id, id))
      .limit(1);
    if (!scenario) throw new NotFoundException('Scenario not found');

    const steps = await this.db
      .select()
      .from(stepMessages)
      .where(eq(stepMessages.scenarioId, id))
      .orderBy(stepMessages.sortOrder);

    return { ...scenario, steps };
  }

  async activateScenario(id: string) {
    await this.db
      .update(stepScenarios)
      .set({ isActive: true })
      .where(eq(stepScenarios.id, id));
  }

  async deactivateScenario(id: string) {
    await this.db
      .update(stepScenarios)
      .set({ isActive: false })
      .where(eq(stepScenarios.id, id));
  }

  // Step messages CRUD
  async addStepMessage(
    scenarioId: string,
    data: {
      delayMinutes: number;
      messageContent: Record<string, unknown>;
      sortOrder: number;
      condition?: Record<string, unknown>;
      branchTrue?: number | null;
      branchFalse?: number | null;
    },
  ) {
    const [step] = await this.db
      .insert(stepMessages)
      .values({ scenarioId, ...data })
      .returning();
    return step;
  }

  async updateStepMessage(
    id: string,
    data: Partial<typeof stepMessages.$inferInsert>,
  ) {
    const [updated] = await this.db
      .update(stepMessages)
      .set(data)
      .where(eq(stepMessages.id, id))
      .returning();
    return updated;
  }

  async deleteStepMessage(id: string) {
    await this.db.delete(stepMessages).where(eq(stepMessages.id, id));
  }

  // Enrollment
  async enrollFriend(friendId: string, scenarioId: string) {
    const steps = await this.db
      .select()
      .from(stepMessages)
      .where(eq(stepMessages.scenarioId, scenarioId))
      .orderBy(stepMessages.sortOrder);

    if (steps.length === 0) return null;

    const nextSendAt = new Date(Date.now() + steps[0].delayMinutes * 60 * 1000);

    const [enrollment] = await this.db
      .insert(stepEnrollments)
      .values({
        friendId,
        scenarioId,
        currentStepIndex: 0,
        status: 'active',
        nextSendAt,
      })
      .returning();

    return enrollment;
  }

  async getEnrollments(scenarioId: string) {
    return this.db
      .select()
      .from(stepEnrollments)
      .where(eq(stepEnrollments.scenarioId, scenarioId));
  }

  // Process due step messages (called by cron/queue)
  async processDueSteps() {
    const now = new Date();
    const dueEnrollments = await this.db
      .select()
      .from(stepEnrollments)
      .where(and(eq(stepEnrollments.status, 'active'), lte(stepEnrollments.nextSendAt, now)));

    for (const enrollment of dueEnrollments) {
      try {
        await this.processEnrollmentStep(enrollment);
      } catch (error) {
        this.logger.error(`Failed to process enrollment ${enrollment.id}: ${error}`);
      }
    }

    return { processed: dueEnrollments.length };
  }

  private async evaluateCondition(
    condition: Record<string, unknown>,
    friendId: string,
    friendRecord: Record<string, unknown> | null,
  ): Promise<boolean> {
    if (!condition || !condition.type) return true;

    switch (condition.type) {
      case 'tag_check': {
        const ft = await this.db
          .select()
          .from(friendTags)
          .where(
            and(
              eq(friendTags.friendId, friendId),
              eq(friendTags.tagId, condition.tagId as string),
            ),
          )
          .limit(1);
        return ft.length > 0;
      }
      case 'score_check': {
        const score = (friendRecord?.score as number) ?? 0;
        const op = (condition.operator as string) || '>=';
        const value = Number(condition.value) || 0;
        if (op === '>=') return score >= value;
        if (op === '<=') return score <= value;
        if (op === '>') return score > value;
        if (op === '<') return score < value;
        if (op === '==') return score === value;
        return true;
      }
      default:
        return true;
    }
  }

  private async processEnrollmentStep(enrollment: typeof stepEnrollments.$inferSelect) {
    // Get scenario steps
    const steps = await this.db
      .select()
      .from(stepMessages)
      .where(eq(stepMessages.scenarioId, enrollment.scenarioId))
      .orderBy(stepMessages.sortOrder);

    const currentStep = steps[enrollment.currentStepIndex];
    if (!currentStep) {
      await this.db
        .update(stepEnrollments)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(stepEnrollments.id, enrollment.id));
      return;
    }

    // Get friend and LINE account
    const [friend] = await this.db
      .select()
      .from(friends)
      .where(eq(friends.id, enrollment.friendId))
      .limit(1);

    if (!friend || !friend.isFollowing) {
      await this.db
        .update(stepEnrollments)
        .set({ status: 'cancelled' })
        .where(eq(stepEnrollments.id, enrollment.id));
      return;
    }

    const [account] = await this.db
      .select()
      .from(lineAccounts)
      .where(eq(lineAccounts.id, friend.lineAccountId))
      .limit(1);

    if (!account) return;

    // Evaluate condition if present
    const condition = currentStep.condition as Record<string, unknown> | null;
    let nextIndex: number;

    if (condition && condition.type) {
      const conditionResult = await this.evaluateCondition(condition, friend.id, friend as unknown as Record<string, unknown>);

      if (conditionResult) {
        // Condition is true: send the message, then branch to branchTrue or next
        const messageContent = currentStep.messageContent as Record<string, unknown>;
        const lineMessages = [{ type: 'text' as const, text: (messageContent.text as string) || String(messageContent) }];

        await this.lineService.pushMessage(
          { channelSecret: account.channelSecret, channelAccessToken: account.channelAccessToken },
          friend.lineUserId,
          lineMessages,
        );

        await this.db.insert(messages).values({
          tenantId: friend.tenantId,
          lineAccountId: account.id,
          friendId: friend.id,
          direction: 'outbound',
          messageType: 'text',
          content: messageContent,
          sendType: 'push',
          status: 'sent',
          sentAt: new Date(),
        });

        nextIndex = currentStep.branchTrue != null
          ? currentStep.branchTrue
          : enrollment.currentStepIndex + 1;
      } else {
        // Condition is false: skip this message, jump to branchFalse or next
        nextIndex = currentStep.branchFalse != null
          ? currentStep.branchFalse
          : enrollment.currentStepIndex + 1;
      }
    } else {
      // No condition: send normally
      const messageContent = currentStep.messageContent as Record<string, unknown>;
      const lineMessages = [{ type: 'text' as const, text: (messageContent.text as string) || String(messageContent) }];

      await this.lineService.pushMessage(
        { channelSecret: account.channelSecret, channelAccessToken: account.channelAccessToken },
        friend.lineUserId,
        lineMessages,
      );

      await this.db.insert(messages).values({
        tenantId: friend.tenantId,
        lineAccountId: account.id,
        friendId: friend.id,
        direction: 'outbound',
        messageType: 'text',
        content: messageContent,
        sendType: 'push',
        status: 'sent',
        sentAt: new Date(),
      });

      nextIndex = enrollment.currentStepIndex + 1;
    }

    // Advance to next step or complete
    if (nextIndex >= steps.length) {
      await this.db
        .update(stepEnrollments)
        .set({
          currentStepIndex: nextIndex,
          status: 'completed',
          completedAt: new Date(),
          nextSendAt: null,
        })
        .where(eq(stepEnrollments.id, enrollment.id));
    } else {
      const nextStep = steps[nextIndex];
      const nextSendAt = new Date(Date.now() + nextStep.delayMinutes * 60 * 1000);
      await this.db
        .update(stepEnrollments)
        .set({ currentStepIndex: nextIndex, nextSendAt })
        .where(eq(stepEnrollments.id, enrollment.id));
    }

    this.logger.log(
      `Step ${enrollment.currentStepIndex + 1}/${steps.length} processed for friend ${friend.id}`,
    );
  }
}
