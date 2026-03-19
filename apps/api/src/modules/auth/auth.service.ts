import { Injectable, Inject, UnauthorizedException, ConflictException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { tenants, adminUsers, adminSessions } from '@line-saas/db';

@Injectable()
export class AuthService {
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
}
