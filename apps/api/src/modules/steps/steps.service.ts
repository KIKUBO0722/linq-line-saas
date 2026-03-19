import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, lte } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import {
  stepScenarios,
  stepMessages,
  stepEnrollments,
  friends,
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
    data: { name: string; description?: string; triggerType: string; triggerConfig?: any },
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
    data: { delayMinutes: number; messageContent: any; sortOrder: number; condition?: any },
  ) {
    const [step] = await this.db
      .insert(stepMessages)
      .values({ scenarioId, ...data })
      .returning();
    return step;
  }

  async updateStepMessage(id: string, data: Partial<typeof stepMessages.$inferInsert>) {
    await this.db.update(stepMessages).set(data).where(eq(stepMessages.id, id));
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

    // Send the message
    const messageContent = currentStep.messageContent as any;
    const lineMessages = [{ type: 'text' as const, text: messageContent.text || messageContent }];

    await this.lineService.pushMessage(
      { channelSecret: account.channelSecret, channelAccessToken: account.channelAccessToken },
      friend.lineUserId,
      lineMessages,
    );

    // Store sent message
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

    // Advance to next step or complete
    const nextIndex = enrollment.currentStepIndex + 1;
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
      `Step ${enrollment.currentStepIndex + 1}/${steps.length} sent to friend ${friend.id}`,
    );
  }
}
