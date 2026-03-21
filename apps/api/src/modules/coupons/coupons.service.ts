import { Injectable, Inject } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { coupons } from '@line-saas/db';

@Injectable()
export class CouponsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async list(tenantId: string) {
    return this.db
      .select()
      .from(coupons)
      .where(eq(coupons.tenantId, tenantId))
      .orderBy(desc(coupons.createdAt));
  }

  async create(
    tenantId: string,
    data: {
      name: string;
      code: string;
      discountType: string;
      discountValue: number;
      description?: string;
      expiresAt?: string;
      maxUses?: number;
    },
  ) {
    const [coupon] = await this.db
      .insert(coupons)
      .values({
        tenantId,
        name: data.name,
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        description: data.description,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        maxUses: data.maxUses ?? null,
      })
      .returning();
    return coupon;
  }

  async update(
    id: string,
    data: {
      name?: string;
      code?: string;
      discountType?: string;
      discountValue?: number;
      description?: string;
      expiresAt?: string | null;
      maxUses?: number | null;
    },
  ) {
    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.code !== undefined) updateData.code = data.code;
    if (data.discountType !== undefined) updateData.discountType = data.discountType;
    if (data.discountValue !== undefined) updateData.discountValue = data.discountValue;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.expiresAt !== undefined)
      updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    if (data.maxUses !== undefined) updateData.maxUses = data.maxUses;

    const [coupon] = await this.db
      .update(coupons)
      .set(updateData)
      .where(eq(coupons.id, id))
      .returning();
    return coupon;
  }

  async delete(id: string) {
    await this.db.delete(coupons).where(eq(coupons.id, id));
  }

  async toggle(id: string, isActive: boolean) {
    const [coupon] = await this.db
      .update(coupons)
      .set({ isActive })
      .where(eq(coupons.id, id))
      .returning();
    return coupon;
  }
}
