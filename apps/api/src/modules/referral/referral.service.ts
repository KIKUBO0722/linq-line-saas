import { Injectable, Inject, Logger, InternalServerErrorException, HttpException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { referralPrograms, referralCodes, referralConversions, affiliatePartners, affiliateReferrals } from '@line-saas/db';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // Tenant referral programs (for LINE friends)
  async createProgram(tenantId: string, data: { name: string; rewardType: string; rewardConfig: Record<string, unknown> }) {
    try {
      const [program] = await this.db.insert(referralPrograms).values({ tenantId, ...data }).returning();
      return program;
    } catch (error) {
      this.logger.error(`Failed to create referral program: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async listPrograms(tenantId: string) {
    try {
      return await this.db.select().from(referralPrograms).where(eq(referralPrograms.tenantId, tenantId));
    } catch (error) {
      this.logger.error(`Failed to list referral programs: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async generateCode(programId: string, friendId: string) {
    try {
      const code = randomBytes(4).toString('hex').toUpperCase();
      const [referralCode] = await this.db
        .insert(referralCodes)
        .values({ programId, friendId, code })
        .returning();
      return referralCode;
    } catch (error) {
      this.logger.error(`Failed to generate referral code: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async recordConversion(codeId: string, referredFriendId: string) {
    try {
      const [conversion] = await this.db
        .insert(referralConversions)
        .values({ codeId, referredFriendId })
        .returning();

      // Increment referral count
      const [code] = await this.db.select().from(referralCodes).where(eq(referralCodes.id, codeId)).limit(1);
      if (code) {
        await this.db
          .update(referralCodes)
          .set({ referralCount: code.referralCount + 1 })
          .where(eq(referralCodes.id, codeId));
      }

      return conversion;
    } catch (error) {
      this.logger.error(`Failed to record referral conversion: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async getProgramStats(programId: string) {
    try {
      const codes = await this.db.select().from(referralCodes).where(eq(referralCodes.programId, programId));
      const totalReferrals = codes.reduce((sum, c) => sum + c.referralCount, 0);
      return { totalCodes: codes.length, totalReferrals, codes };
    } catch (error) {
      this.logger.error(`Failed to get program stats for ${programId}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  // SaaS affiliate (platform level)
  async registerAffiliate(adminUserId: string) {
    try {
      const code = `AFF-${randomBytes(4).toString('hex').toUpperCase()}`;
      const [partner] = await this.db
        .insert(affiliatePartners)
        .values({ adminUserId, affiliateCode: code })
        .returning();
      return partner;
    } catch (error) {
      this.logger.error(`Failed to register affiliate: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async getAffiliateByUser(adminUserId: string) {
    try {
      const [partner] = await this.db
        .select()
        .from(affiliatePartners)
        .where(eq(affiliatePartners.adminUserId, adminUserId))
        .limit(1);
      return partner;
    } catch (error) {
      this.logger.error(`Failed to get affiliate by user: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async getAffiliateReferrals(partnerId: string) {
    try {
      return await this.db.select().from(affiliateReferrals).where(eq(affiliateReferrals.partnerId, partnerId));
    } catch (error) {
      this.logger.error(`Failed to get affiliate referrals: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }
}
