import { Injectable, Inject, Logger, InternalServerErrorException, HttpException } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { coupons } from '@line-saas/db';

@Injectable()
export class CouponsService {
  private readonly logger = new Logger(CouponsService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async list(tenantId: string) {
    try {
      return await this.db
        .select()
        .from(coupons)
        .where(eq(coupons.tenantId, tenantId))
        .orderBy(desc(coupons.createdAt));
    } catch (error) {
      this.logger.error(`Failed to list coupons: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
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
    try {
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
    } catch (error) {
      this.logger.error(`Failed to create coupon: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
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
    try {
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
    } catch (error) {
      this.logger.error(`Failed to update coupon ${id}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async delete(id: string) {
    try {
      await this.db.delete(coupons).where(eq(coupons.id, id));
    } catch (error) {
      this.logger.error(`Failed to delete coupon ${id}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async toggle(id: string, isActive: boolean) {
    try {
      const [coupon] = await this.db
        .update(coupons)
        .set({ isActive })
        .where(eq(coupons.id, id))
        .returning();
      return coupon;
    } catch (error) {
      this.logger.error(`Failed to toggle coupon ${id}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }
}
