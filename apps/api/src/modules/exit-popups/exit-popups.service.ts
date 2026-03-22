import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, desc, and, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { exitPopups } from '@line-saas/db';

@Injectable()
export class ExitPopupsService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  private async verifyOwnership(id: string, tenantId: string) {
    const [popup] = await this.db.select().from(exitPopups).where(and(eq(exitPopups.id, id), eq(exitPopups.tenantId, tenantId)));
    if (!popup) throw new NotFoundException('ポップアップが見つかりません');
    return popup;
  }

  async create(tenantId: string, data: {
    name: string; targetType?: string; targetId?: string;
    title?: string; message?: string; couponCode?: string; couponLabel?: string;
    ctaText?: string; ctaUrl?: string; triggerType?: string; delaySeconds?: number;
  }) {
    if (!data.name?.trim()) throw new ForbiddenException('名前は必須です');
    const [popup] = await this.db
      .insert(exitPopups)
      .values({ tenantId, ...data, name: data.name.trim() })
      .returning();
    return popup;
  }

  async list(tenantId: string) {
    return this.db
      .select()
      .from(exitPopups)
      .where(eq(exitPopups.tenantId, tenantId))
      .orderBy(desc(exitPopups.createdAt))
      .limit(100);
  }

  async update(id: string, tenantId: string, data: Partial<{
    name: string; targetType: string; targetId: string;
    title: string; message: string; couponCode: string; couponLabel: string;
    ctaText: string; ctaUrl: string; triggerType: string;
    delaySeconds: number; isActive: boolean;
  }>) {
    await this.verifyOwnership(id, tenantId);
    const [popup] = await this.db.update(exitPopups).set(data).where(and(eq(exitPopups.id, id), eq(exitPopups.tenantId, tenantId))).returning();
    return popup;
  }

  async delete(id: string, tenantId: string) {
    await this.verifyOwnership(id, tenantId);
    await this.db.delete(exitPopups).where(and(eq(exitPopups.id, id), eq(exitPopups.tenantId, tenantId)));
    return { success: true };
  }

  async getActiveForTarget(tenantId: string, targetType: string, targetId?: string) {
    const results = await this.db
      .select()
      .from(exitPopups)
      .where(and(eq(exitPopups.tenantId, tenantId), eq(exitPopups.isActive, true)))
      .limit(10);
    return results.filter((p) =>
      p.targetType === 'all' || p.targetType === targetType || (targetId && p.targetId === targetId),
    );
  }

  async incrementShow(id: string) {
    await this.db
      .update(exitPopups)
      .set({ showCount: sql`${exitPopups.showCount} + 1` })
      .where(eq(exitPopups.id, id));
  }

  async incrementClick(id: string) {
    await this.db
      .update(exitPopups)
      .set({ clickCount: sql`${exitPopups.clickCount} + 1` })
      .where(eq(exitPopups.id, id));
  }
}
