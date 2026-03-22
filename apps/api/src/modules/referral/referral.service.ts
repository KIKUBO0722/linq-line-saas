import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { referralPrograms, referralCodes, referralConversions, affiliatePartners, affiliateReferrals } from '@line-saas/db';

@Injectable()
export class ReferralService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // Tenant referral programs (for LINE friends)
  async createProgram(tenantId: string, data: { name: string; rewardType: string; rewardConfig: Record<string, unknown> }) {
    const [program] = await this.db.insert(referralPrograms).values({ tenantId, ...data }).returning();
    return program;
  }

  async listPrograms(tenantId: string) {
    return this.db.select().from(referralPrograms).where(eq(referralPrograms.tenantId, tenantId));
  }

  async generateCode(programId: string, friendId: string) {
    const code = randomBytes(4).toString('hex').toUpperCase();
    const [referralCode] = await this.db
      .insert(referralCodes)
      .values({ programId, friendId, code })
      .returning();
    return referralCode;
  }

  async recordConversion(codeId: string, referredFriendId: string) {
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
  }

  async getProgramStats(programId: string) {
    const codes = await this.db.select().from(referralCodes).where(eq(referralCodes.programId, programId));
    const totalReferrals = codes.reduce((sum, c) => sum + c.referralCount, 0);
    return { totalCodes: codes.length, totalReferrals, codes };
  }

  // SaaS affiliate (platform level)
  async registerAffiliate(adminUserId: string) {
    const code = `AFF-${randomBytes(4).toString('hex').toUpperCase()}`;
    const [partner] = await this.db
      .insert(affiliatePartners)
      .values({ adminUserId, affiliateCode: code })
      .returning();
    return partner;
  }

  async getAffiliateByUser(adminUserId: string) {
    const [partner] = await this.db
      .select()
      .from(affiliatePartners)
      .where(eq(affiliatePartners.adminUserId, adminUserId))
      .limit(1);
    return partner;
  }

  async getAffiliateReferrals(partnerId: string) {
    return this.db.select().from(affiliateReferrals).where(eq(affiliateReferrals.partnerId, partnerId));
  }
}
