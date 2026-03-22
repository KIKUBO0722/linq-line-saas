import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, desc, and, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { conversionGoals, conversionEvents } from '@line-saas/db';

@Injectable()
export class ConversionService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  private async verifyGoalOwnership(id: string, tenantId: string) {
    const [goal] = await this.db.select().from(conversionGoals).where(and(eq(conversionGoals.id, id), eq(conversionGoals.tenantId, tenantId)));
    if (!goal) throw new NotFoundException('コンバージョン目標が見つかりません');
    return goal;
  }

  async createGoal(tenantId: string, data: { name: string; type: string; targetId?: string }) {
    if (!data.name?.trim()) throw new ForbiddenException('目標名は必須です');
    if (!data.type?.trim()) throw new ForbiddenException('種別は必須です');
    const [goal] = await this.db
      .insert(conversionGoals)
      .values({ tenantId, name: data.name.trim(), type: data.type.trim(), targetId: data.targetId })
      .returning();
    return goal;
  }

  async listGoals(tenantId: string) {
    return this.db
      .select()
      .from(conversionGoals)
      .where(eq(conversionGoals.tenantId, tenantId))
      .orderBy(desc(conversionGoals.createdAt))
      .limit(100);
  }

  async updateGoal(id: string, tenantId: string, data: { name?: string; isActive?: boolean }) {
    await this.verifyGoalOwnership(id, tenantId);
    const [goal] = await this.db
      .update(conversionGoals)
      .set(data)
      .where(and(eq(conversionGoals.id, id), eq(conversionGoals.tenantId, tenantId)))
      .returning();
    return goal;
  }

  async deleteGoal(id: string, tenantId: string) {
    await this.verifyGoalOwnership(id, tenantId);
    await this.db.delete(conversionGoals).where(and(eq(conversionGoals.id, id), eq(conversionGoals.tenantId, tenantId)));
    return { success: true };
  }

  async recordConversion(tenantId: string, goalId: string, friendId?: string, trackedUrlId?: string, metadata?: Record<string, unknown>) {
    await this.verifyGoalOwnership(goalId, tenantId);
    const [event] = await this.db
      .insert(conversionEvents)
      .values({ goalId, friendId, trackedUrlId, metadata: metadata ?? {} })
      .returning();
    await this.db
      .update(conversionGoals)
      .set({ conversionCount: sql`${conversionGoals.conversionCount} + 1` })
      .where(eq(conversionGoals.id, goalId));
    return event;
  }

  async getGoalEvents(goalId: string, tenantId: string) {
    await this.verifyGoalOwnership(goalId, tenantId);
    return this.db
      .select()
      .from(conversionEvents)
      .where(eq(conversionEvents.goalId, goalId))
      .orderBy(desc(conversionEvents.convertedAt))
      .limit(100);
  }

  async findMatchingGoals(tenantId: string, type: string, targetId?: string) {
    const conditions = [
      eq(conversionGoals.tenantId, tenantId),
      eq(conversionGoals.type, type),
      eq(conversionGoals.isActive, true),
    ];
    if (targetId) {
      conditions.push(eq(conversionGoals.targetId, targetId));
    }
    return this.db
      .select()
      .from(conversionGoals)
      .where(and(...conditions));
  }
}
