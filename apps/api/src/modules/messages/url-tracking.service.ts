import { Injectable, Inject, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and, sql, desc } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { trackedUrls, urlClicks } from '@line-saas/db';

@Injectable()
export class UrlTrackingService {
  private readonly logger = new Logger(UrlTrackingService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async createTrackedUrl(tenantId: string, originalUrl: string, messageId?: string) {
    const shortCode = `t_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const [tracked] = await this.db.insert(trackedUrls).values({
      tenantId, originalUrl, shortCode, messageId,
    }).returning();
    return tracked;
  }

  async recordClick(shortCode: string, friendId?: string, userAgent?: string) {
    const [tracked] = await this.db.select().from(trackedUrls).where(eq(trackedUrls.shortCode, shortCode)).limit(1);
    if (!tracked) return null;

    await this.db.insert(urlClicks).values({
      trackedUrlId: tracked.id, friendId, userAgent,
    });
    await this.db.update(trackedUrls)
      .set({ clickCount: sql`${trackedUrls.clickCount} + 1` })
      .where(eq(trackedUrls.id, tracked.id));

    return tracked;
  }

  async listTrackedUrls(tenantId: string) {
    return this.db.select().from(trackedUrls)
      .where(eq(trackedUrls.tenantId, tenantId))
      .orderBy(desc(trackedUrls.createdAt))
      .limit(100);
  }

  async getUrlStats(id: string) {
    const clicks = await this.db.select().from(urlClicks)
      .where(eq(urlClicks.trackedUrlId, id))
      .orderBy(desc(urlClicks.clickedAt));
    return clicks;
  }

  async updateTrackedUrl(tenantId: string, id: string, data: { originalUrl?: string }) {
    const [existing] = await this.db.select().from(trackedUrls)
      .where(eq(trackedUrls.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException('Tracked URL not found');
    if (existing.tenantId !== tenantId) throw new ForbiddenException('Access denied');

    const [updated] = await this.db.update(trackedUrls)
      .set({ originalUrl: data.originalUrl ?? existing.originalUrl })
      .where(and(eq(trackedUrls.id, id), eq(trackedUrls.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async deleteTrackedUrl(tenantId: string, id: string) {
    const [existing] = await this.db.select().from(trackedUrls)
      .where(eq(trackedUrls.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException('Tracked URL not found');
    if (existing.tenantId !== tenantId) throw new ForbiddenException('Access denied');

    await this.db.delete(trackedUrls)
      .where(and(eq(trackedUrls.id, id), eq(trackedUrls.tenantId, tenantId)));

    return { deleted: true };
  }
}
