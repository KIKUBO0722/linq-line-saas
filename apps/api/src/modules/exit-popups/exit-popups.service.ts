import { Injectable, Inject, NotFoundException, ForbiddenException, Logger, InternalServerErrorException, HttpException } from '@nestjs/common';
import { eq, desc, and, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { exitPopups } from '@line-saas/db';

@Injectable()
export class ExitPopupsService {
  private readonly logger = new Logger(ExitPopupsService.name);

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
    try {
      if (!data.name?.trim()) throw new ForbiddenException('名前は必須です');
      const [popup] = await this.db
        .insert(exitPopups)
        .values({ tenantId, ...data, name: data.name.trim() })
        .returning();
      return popup;
    } catch (error) {
      this.logger.error(`Failed to create exit popup: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async list(tenantId: string) {
    try {
      return await this.db
        .select()
        .from(exitPopups)
        .where(eq(exitPopups.tenantId, tenantId))
        .orderBy(desc(exitPopups.createdAt))
        .limit(100);
    } catch (error) {
      this.logger.error(`Failed to list exit popups: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async update(id: string, tenantId: string, data: Partial<{
    name: string; targetType: string; targetId: string;
    title: string; message: string; couponCode: string; couponLabel: string;
    ctaText: string; ctaUrl: string; triggerType: string;
    delaySeconds: number; isActive: boolean;
  }>) {
    try {
      await this.verifyOwnership(id, tenantId);
      const [popup] = await this.db.update(exitPopups).set(data).where(and(eq(exitPopups.id, id), eq(exitPopups.tenantId, tenantId))).returning();
      return popup;
    } catch (error) {
      this.logger.error(`Failed to update exit popup ${id}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async delete(id: string, tenantId: string) {
    try {
      await this.verifyOwnership(id, tenantId);
      await this.db.delete(exitPopups).where(and(eq(exitPopups.id, id), eq(exitPopups.tenantId, tenantId)));
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to delete exit popup ${id}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async getActiveForTarget(tenantId: string, targetType: string, targetId?: string) {
    try {
      const results = await this.db
        .select()
        .from(exitPopups)
        .where(and(eq(exitPopups.tenantId, tenantId), eq(exitPopups.isActive, true)))
        .limit(10);
      return results.filter((p) =>
        p.targetType === 'all' || p.targetType === targetType || (targetId && p.targetId === targetId),
      );
    } catch (error) {
      this.logger.error(`Failed to get active exit popups: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async incrementShow(id: string) {
    try {
      await this.db
        .update(exitPopups)
        .set({ showCount: sql`${exitPopups.showCount} + 1` })
        .where(eq(exitPopups.id, id));
    } catch (error) {
      this.logger.error(`Failed to increment show count for popup ${id}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async incrementClick(id: string) {
    try {
      await this.db
        .update(exitPopups)
        .set({ clickCount: sql`${exitPopups.clickCount} + 1` })
        .where(eq(exitPopups.id, id));
    } catch (error) {
      this.logger.error(`Failed to increment click count for popup ${id}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }
}
