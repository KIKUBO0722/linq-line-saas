import { Injectable, Inject, UnauthorizedException, ConflictException, ForbiddenException, NotFoundException, Logger, InternalServerErrorException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { OAuthProfile } from './dto/oauth.dto';
import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { tenants, adminUsers, adminSessions, tenantInvitations } from '@line-saas/db';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async signup(email: string, password: string, tenantName: string) {
    // Check if email already exists
    const existing = await this.db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('Email already registered');
    }

    // Create tenant
    const slug = tenantName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const [tenant] = await this.db
      .insert(tenants)
      .values({
        name: tenantName,
        slug: `${slug}-${randomBytes(4).toString('hex')}`,
        status: 'trial',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      })
      .returning();

    // Create admin user
    const passwordHash = await argon2.hash(password);
    const [user] = await this.db
      .insert(adminUsers)
      .values({
        tenantId: tenant.id,
        email,
        passwordHash,
        role: 'owner',
      })
      .returning();

    // Create session
    const session = await this.createSession(user.id);

    return {
      session,
      user: { id: user.id, email: user.email, role: user.role, displayName: user.displayName },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status },
    };
  }

  async login(email: string, password: string) {
    const [user] = await this.db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('このアカウントはソーシャルログインで登録されています。Google または LINE でログインしてください。');
    }

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Get tenant
    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, user.tenantId))
      .limit(1);

    const session = await this.createSession(user.id);

    return {
      session,
      user: { id: user.id, email: user.email, role: user.role, displayName: user.displayName },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status },
    };
  }

  async validateSession(sessionId: string) {
    const [session] = await this.db
      .select()
      .from(adminSessions)
      .where(eq(adminSessions.id, sessionId))
      .limit(1);

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    const [user] = await this.db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, session.userId))
      .limit(1);

    if (!user) return null;

    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, user.tenantId))
      .limit(1);

    return { user, tenant };
  }

  async logout(sessionId: string) {
    await this.db.delete(adminSessions).where(eq(adminSessions.id, sessionId));
  }

  async socialLogin(profile: OAuthProfile) {
    try {
      const providerIdCol = profile.provider === 'google' ? adminUsers.googleId : adminUsers.lineId;

      // 1. Look up by provider ID (returning SSO user)
      const [existingByProvider] = await this.db
        .select()
        .from(adminUsers)
        .where(eq(providerIdCol, profile.providerId))
        .limit(1);

      if (existingByProvider) {
        const [tenant] = await this.db
          .select()
          .from(tenants)
          .where(eq(tenants.id, existingByProvider.tenantId))
          .limit(1);

        // Update avatar if changed
        if (profile.avatarUrl && profile.avatarUrl !== existingByProvider.avatarUrl) {
          await this.db
            .update(adminUsers)
            .set({ avatarUrl: profile.avatarUrl })
            .where(eq(adminUsers.id, existingByProvider.id));
        }

        const session = await this.createSession(existingByProvider.id);
        return {
          session,
          user: { id: existingByProvider.id, email: existingByProvider.email, role: existingByProvider.role, displayName: existingByProvider.displayName },
          tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status },
        };
      }

      // 2. Check if email matches an existing user (link accounts)
      if (profile.email) {
        const [existingByEmail] = await this.db
          .select()
          .from(adminUsers)
          .where(eq(adminUsers.email, profile.email))
          .limit(1);

        if (existingByEmail) {
          // Link the SSO account to existing user
          const updateData: Record<string, string> = {};
          if (profile.provider === 'google') updateData.googleId = profile.providerId;
          if (profile.provider === 'line') updateData.lineId = profile.providerId;
          if (profile.avatarUrl) updateData.avatarUrl = profile.avatarUrl;
          if (profile.name && !existingByEmail.displayName) updateData.displayName = profile.name;

          await this.db
            .update(adminUsers)
            .set(updateData)
            .where(eq(adminUsers.id, existingByEmail.id));

          const [tenant] = await this.db
            .select()
            .from(tenants)
            .where(eq(tenants.id, existingByEmail.tenantId))
            .limit(1);

          const session = await this.createSession(existingByEmail.id);
          return {
            session,
            user: { id: existingByEmail.id, email: existingByEmail.email, role: existingByEmail.role, displayName: existingByEmail.displayName || profile.name },
            tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status },
          };
        }
      }

      // 3. New user: create tenant + user
      const tenantName = profile.name || profile.email?.split('@')[0] || 'My Workspace';
      const slug = tenantName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'workspace';

      const [tenant] = await this.db
        .insert(tenants)
        .values({
          name: tenantName,
          slug: `${slug}-${randomBytes(4).toString('hex')}`,
          status: 'trial',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        })
        .returning();

      const userValues: Record<string, unknown> = {
        tenantId: tenant.id,
        email: profile.email || `${profile.provider}_${profile.providerId}@oauth.local`,
        role: 'owner',
        displayName: profile.name,
        avatarUrl: profile.avatarUrl,
        authProvider: profile.provider,
      };
      if (profile.provider === 'google') userValues.googleId = profile.providerId;
      if (profile.provider === 'line') userValues.lineId = profile.providerId;

      const [user] = await this.db
        .insert(adminUsers)
        .values(userValues as typeof adminUsers.$inferInsert)
        .returning();

      const session = await this.createSession(user.id);
      this.logger.log(`New ${profile.provider} user created: ${user.email} (tenant: ${tenant.name})`);

      return {
        session,
        user: { id: user.id, email: user.email, role: user.role, displayName: user.displayName },
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status },
      };
    } catch (error) {
      this.logger.error(`Social login failed: ${error}`);
      throw new InternalServerErrorException('ソーシャルログインに失敗しました');
    }
  }

  private async createSession(userId: string) {
    const sessionId = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.db.insert(adminSessions).values({
      id: sessionId,
      userId,
      expiresAt,
    });

    return { id: sessionId, expiresAt };
  }

  // --- Team Management ---

  async getTeamMembers(tenantId: string) {
    const members = await this.db
      .select({
        id: adminUsers.id,
        email: adminUsers.email,
        role: adminUsers.role,
        displayName: adminUsers.displayName,
        createdAt: adminUsers.createdAt,
      })
      .from(adminUsers)
      .where(eq(adminUsers.tenantId, tenantId))
      .orderBy(adminUsers.createdAt);
    return members;
  }

  async inviteUser(tenantId: string, email: string, role: string = 'operator') {
    // Check if email already exists as user
    const [existing] = await this.db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email))
      .limit(1);

    if (existing) {
      throw new ConflictException('このメールアドレスは既に登録されています');
    }

    // Check for pending invitation
    const [existingInvite] = await this.db
      .select()
      .from(tenantInvitations)
      .where(and(
        eq(tenantInvitations.tenantId, tenantId),
        eq(tenantInvitations.email, email),
        eq(tenantInvitations.status, 'pending'),
      ))
      .limit(1);

    if (existingInvite) {
      throw new ConflictException('このメールアドレスには既に招待を送信済みです');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const [invitation] = await this.db
      .insert(tenantInvitations)
      .values({
        tenantId,
        email,
        role,
        token,
        status: 'pending',
        expiresAt,
      })
      .returning();

    return invitation;
  }

  async listInvitations(tenantId: string) {
    return this.db
      .select()
      .from(tenantInvitations)
      .where(eq(tenantInvitations.tenantId, tenantId))
      .orderBy(desc(tenantInvitations.createdAt));
  }

  async cancelInvitation(tenantId: string, invitationId: string) {
    const [invitation] = await this.db
      .select()
      .from(tenantInvitations)
      .where(and(
        eq(tenantInvitations.id, invitationId),
        eq(tenantInvitations.tenantId, tenantId),
      ))
      .limit(1);

    if (!invitation) {
      throw new NotFoundException('招待が見つかりません');
    }

    await this.db
      .delete(tenantInvitations)
      .where(eq(tenantInvitations.id, invitationId));

    return { success: true };
  }

  async acceptInvitation(token: string, password: string, displayName?: string) {
    const [invitation] = await this.db
      .select()
      .from(tenantInvitations)
      .where(and(
        eq(tenantInvitations.token, token),
        eq(tenantInvitations.status, 'pending'),
      ))
      .limit(1);

    if (!invitation) {
      throw new NotFoundException('招待が見つからないか、期限切れです');
    }

    if (invitation.expiresAt < new Date()) {
      await this.db
        .update(tenantInvitations)
        .set({ status: 'expired' })
        .where(eq(tenantInvitations.id, invitation.id));
      throw new ForbiddenException('招待の有効期限が切れています');
    }

    // Create user
    const passwordHash = await argon2.hash(password);
    const [user] = await this.db
      .insert(adminUsers)
      .values({
        tenantId: invitation.tenantId,
        email: invitation.email,
        passwordHash,
        role: invitation.role,
        displayName,
        invitedBy: null,
      })
      .returning();

    // Mark invitation as accepted
    await this.db
      .update(tenantInvitations)
      .set({ status: 'accepted' })
      .where(eq(tenantInvitations.id, invitation.id));

    // Get tenant
    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, invitation.tenantId))
      .limit(1);

    const session = await this.createSession(user.id);

    return {
      session,
      user: { id: user.id, email: user.email, role: user.role, displayName: user.displayName },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status },
    };
  }

  async updateUserRole(tenantId: string, userId: string, role: string) {
    const [user] = await this.db
      .select()
      .from(adminUsers)
      .where(and(eq(adminUsers.id, userId), eq(adminUsers.tenantId, tenantId)))
      .limit(1);

    if (!user) {
      throw new NotFoundException('メンバーが見つかりません');
    }

    if (user.role === 'owner') {
      throw new ForbiddenException('オーナーの権限は変更できません');
    }

    await this.db
      .update(adminUsers)
      .set({ role })
      .where(eq(adminUsers.id, userId));

    return { success: true };
  }

  async removeMember(tenantId: string, userId: string) {
    const [user] = await this.db
      .select()
      .from(adminUsers)
      .where(and(eq(adminUsers.id, userId), eq(adminUsers.tenantId, tenantId)))
      .limit(1);

    if (!user) {
      throw new NotFoundException('メンバーが見つかりません');
    }

    if (user.role === 'owner') {
      throw new ForbiddenException('オーナーは削除できません');
    }

    // Delete sessions first
    const sessions = await this.db
      .select({ id: adminSessions.id })
      .from(adminSessions)
      .where(eq(adminSessions.userId, userId));

    for (const session of sessions) {
      await this.db.delete(adminSessions).where(eq(adminSessions.id, session.id));
    }

    await this.db
      .delete(adminUsers)
      .where(eq(adminUsers.id, userId));

    return { success: true };
  }
}
