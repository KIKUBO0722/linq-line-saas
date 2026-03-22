import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, desc, and, sql, count } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { gachaCampaigns, gachaPrizes, gachaDraws } from '@line-saas/db';

@Injectable()
export class GachaService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  private async verifyCampaignOwnership(id: string, tenantId: string) {
    const [campaign] = await this.db.select().from(gachaCampaigns).where(and(eq(gachaCampaigns.id, id), eq(gachaCampaigns.tenantId, tenantId)));
    if (!campaign) throw new NotFoundException('キャンペーンが見つかりません');
    return campaign;
  }

  async createCampaign(tenantId: string, data: {
    name: string; description?: string; maxDrawsPerUser?: number;
    style?: string; startAt?: string; endAt?: string;
  }) {
    if (!data.name?.trim()) throw new ForbiddenException('キャンペーン名は必須です');
    const [campaign] = await this.db
      .insert(gachaCampaigns)
      .values({
        tenantId,
        name: data.name.trim(),
        description: data.description?.trim(),
        maxDrawsPerUser: data.maxDrawsPerUser ?? 1,
        style: data.style ?? 'capsule',
        startAt: data.startAt ? new Date(data.startAt) : undefined,
        endAt: data.endAt ? new Date(data.endAt) : undefined,
      })
      .returning();
    return campaign;
  }

  async listCampaigns(tenantId: string) {
    return this.db
      .select()
      .from(gachaCampaigns)
      .where(eq(gachaCampaigns.tenantId, tenantId))
      .orderBy(desc(gachaCampaigns.createdAt))
      .limit(100);
  }

  async getCampaign(id: string, tenantId: string) {
    const campaign = await this.verifyCampaignOwnership(id, tenantId);
    const prizes = await this.db
      .select()
      .from(gachaPrizes)
      .where(eq(gachaPrizes.campaignId, id))
      .orderBy(gachaPrizes.sortOrder);
    return { ...campaign, prizes };
  }

  async updateCampaign(id: string, tenantId: string, data: Partial<{
    name: string; description: string; maxDrawsPerUser: number;
    isActive: boolean; style: string; startAt: string; endAt: string;
  }>) {
    await this.verifyCampaignOwnership(id, tenantId);
    const updateData: Record<string, unknown> = { ...data };
    if (data.startAt) updateData.startAt = new Date(data.startAt);
    if (data.endAt) updateData.endAt = new Date(data.endAt);
    const [campaign] = await this.db
      .update(gachaCampaigns)
      .set(updateData)
      .where(and(eq(gachaCampaigns.id, id), eq(gachaCampaigns.tenantId, tenantId)))
      .returning();
    return campaign;
  }

  async deleteCampaign(id: string, tenantId: string) {
    await this.verifyCampaignOwnership(id, tenantId);
    await this.db.delete(gachaCampaigns).where(and(eq(gachaCampaigns.id, id), eq(gachaCampaigns.tenantId, tenantId)));
    return { success: true };
  }

  async addPrize(campaignId: string, tenantId: string, data: {
    name: string; weight?: number; prizeType?: string;
    couponId?: string; winMessage?: string; maxQuantity?: number; sortOrder?: number;
  }) {
    await this.verifyCampaignOwnership(campaignId, tenantId);
    if (!data.name?.trim()) throw new ForbiddenException('景品名は必須です');
    const [prize] = await this.db
      .insert(gachaPrizes)
      .values({
        campaignId,
        name: data.name.trim(),
        weight: data.weight ?? 1,
        prizeType: data.prizeType ?? 'message',
        couponId: data.couponId,
        winMessage: data.winMessage?.trim(),
        maxQuantity: data.maxQuantity ?? 0,
        sortOrder: data.sortOrder ?? 0,
      })
      .returning();
    return prize;
  }

  async updatePrize(id: string, tenantId: string, data: Partial<{
    name: string; weight: number; prizeType: string;
    couponId: string; winMessage: string; maxQuantity: number; sortOrder: number;
  }>) {
    // Verify the prize belongs to a campaign owned by the tenant
    const [prize] = await this.db.select().from(gachaPrizes).where(eq(gachaPrizes.id, id));
    if (!prize) throw new NotFoundException('景品が見つかりません');
    await this.verifyCampaignOwnership(prize.campaignId, tenantId);
    const [updated] = await this.db.update(gachaPrizes).set(data).where(eq(gachaPrizes.id, id)).returning();
    return updated;
  }

  async deletePrize(id: string, tenantId: string) {
    const [prize] = await this.db.select().from(gachaPrizes).where(eq(gachaPrizes.id, id));
    if (!prize) throw new NotFoundException('景品が見つかりません');
    await this.verifyCampaignOwnership(prize.campaignId, tenantId);
    await this.db.delete(gachaPrizes).where(eq(gachaPrizes.id, id));
    return { success: true };
  }

  async draw(campaignId: string, tenantId: string, friendId?: string) {
    const campaign = await this.verifyCampaignOwnership(campaignId, tenantId);
    if (!campaign.isActive) throw new ForbiddenException('キャンペーンが無効です');

    const now = new Date();
    if (campaign.startAt && now < new Date(campaign.startAt)) throw new ForbiddenException('キャンペーン開始前です');
    if (campaign.endAt && now > new Date(campaign.endAt)) throw new ForbiddenException('キャンペーンは終了しました');

    if (friendId && campaign.maxDrawsPerUser > 0) {
      const [existing] = await this.db
        .select({ cnt: count() })
        .from(gachaDraws)
        .where(and(eq(gachaDraws.campaignId, campaignId), eq(gachaDraws.friendId, friendId)));
      if (existing && existing.cnt >= campaign.maxDrawsPerUser) {
        throw new ForbiddenException('抽選回数の上限に達しました');
      }
    }

    const prizes = await this.db.select().from(gachaPrizes).where(eq(gachaPrizes.campaignId, campaignId));
    const available = prizes.filter((p) => p.maxQuantity === 0 || p.wonCount < p.maxQuantity);
    if (available.length === 0) throw new ForbiddenException('景品がありません');

    const totalWeight = available.reduce((sum, p) => sum + p.weight, 0);
    let rand = Math.random() * totalWeight;
    let selectedPrize = available[0];
    for (const prize of available) {
      rand -= prize.weight;
      if (rand <= 0) { selectedPrize = prize; break; }
    }

    const [drawRecord] = await this.db
      .insert(gachaDraws)
      .values({ campaignId, friendId, prizeId: selectedPrize.id })
      .returning();

    await this.db.update(gachaPrizes).set({ wonCount: sql`${gachaPrizes.wonCount} + 1` }).where(eq(gachaPrizes.id, selectedPrize.id));
    await this.db.update(gachaCampaigns).set({ totalDraws: sql`${gachaCampaigns.totalDraws} + 1` }).where(eq(gachaCampaigns.id, campaignId));

    return { draw: drawRecord, prize: selectedPrize };
  }

  async getDrawHistory(campaignId: string, tenantId: string) {
    await this.verifyCampaignOwnership(campaignId, tenantId);
    return this.db
      .select()
      .from(gachaDraws)
      .where(eq(gachaDraws.campaignId, campaignId))
      .orderBy(desc(gachaDraws.drawnAt))
      .limit(100);
  }
}
