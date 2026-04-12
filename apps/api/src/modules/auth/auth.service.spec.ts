import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { DRIZZLE } from '../../database/database.module';
import type { OAuthProfile } from './dto/oauth.dto';

/**
 * AuthService regression tests.
 * Covers socialLogin flow: returning user, email linking, and new user creation.
 */
describe('AuthService - socialLogin', () => {
  let service: AuthService;
  let mockDb: {
    select: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
  };

  // Helpers to build chainable query mocks
  function chainSelect(rows: Record<string, unknown>[]) {
    return {
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(rows),
        }),
      }),
    };
  }

  function chainInsert(rows: Record<string, unknown>[]) {
    return {
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue(rows),
      }),
    };
  }

  function chainUpdate() {
    return {
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      }),
    };
  }

  const mockSession = { id: 'session-abc', expiresAt: new Date() };

  beforeEach(async () => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('returning user (existing provider ID)', () => {
    it('should login existing Google user and return session', async () => {
      const existingUser = {
        id: 'user-1', email: 'test@example.com', tenantId: 'tenant-1',
        role: 'owner', displayName: 'Test User', avatarUrl: null, googleId: 'g-123',
      };
      const tenant = { id: 'tenant-1', name: 'Test Tenant', slug: 'test', status: 'active' };

      // 1st select: find by googleId → found
      mockDb.select.mockReturnValueOnce(chainSelect([existingUser]));
      // 2nd select: get tenant
      mockDb.select.mockReturnValueOnce(chainSelect([tenant]));
      // insert session
      mockDb.insert.mockReturnValueOnce(chainInsert([mockSession]));

      const profile: OAuthProfile = {
        provider: 'google', providerId: 'g-123',
        email: 'test@example.com', name: 'Test User',
      };

      const result = await service.socialLogin(profile);

      expect(result.user.id).toBe('user-1');
      expect(result.tenant.id).toBe('tenant-1');
      expect(result.session).toBeDefined();
    });

    it('should update avatar when it changes', async () => {
      const existingUser = {
        id: 'user-1', email: 'test@example.com', tenantId: 'tenant-1',
        role: 'owner', displayName: 'Test', avatarUrl: 'old-url', googleId: 'g-123',
      };
      const tenant = { id: 'tenant-1', name: 'Tenant', slug: 't', status: 'active' };

      mockDb.select.mockReturnValueOnce(chainSelect([existingUser]));
      mockDb.select.mockReturnValueOnce(chainSelect([tenant]));
      mockDb.update.mockReturnValueOnce(chainUpdate());
      mockDb.insert.mockReturnValueOnce(chainInsert([mockSession]));

      const profile: OAuthProfile = {
        provider: 'google', providerId: 'g-123',
        email: 'test@example.com', name: 'Test',
        avatarUrl: 'new-url',
      };

      await service.socialLogin(profile);

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('email linking (existing email, new provider)', () => {
    it('should link Google to existing email-based user', async () => {
      const existingUser = {
        id: 'user-2', email: 'link@example.com', tenantId: 'tenant-2',
        role: 'owner', displayName: 'Link User', googleId: null,
      };
      const tenant = { id: 'tenant-2', name: 'Link Tenant', slug: 'link', status: 'active' };

      // 1st select: find by googleId → not found
      mockDb.select.mockReturnValueOnce(chainSelect([]));
      // 2nd select: find by email → found
      mockDb.select.mockReturnValueOnce(chainSelect([existingUser]));
      // update: set googleId
      mockDb.update.mockReturnValueOnce(chainUpdate());
      // 3rd select: get tenant
      mockDb.select.mockReturnValueOnce(chainSelect([tenant]));
      // insert session
      mockDb.insert.mockReturnValueOnce(chainInsert([mockSession]));

      const profile: OAuthProfile = {
        provider: 'google', providerId: 'g-new',
        email: 'link@example.com', name: 'Link User',
      };

      const result = await service.socialLogin(profile);

      expect(result.user.id).toBe('user-2');
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('new user creation', () => {
    it('should create tenant and user for new Google signup', async () => {
      // 1st select: find by googleId → not found
      mockDb.select.mockReturnValueOnce(chainSelect([]));
      // 2nd select: find by email → not found
      mockDb.select.mockReturnValueOnce(chainSelect([]));
      // insert tenant
      mockDb.insert.mockReturnValueOnce(chainInsert([{
        id: 'tenant-new', name: 'New User', slug: 'new-user-abc', status: 'trial',
      }]));
      // insert user
      mockDb.insert.mockReturnValueOnce(chainInsert([{
        id: 'user-new', email: 'new@example.com', role: 'owner', displayName: 'New User',
      }]));
      // insert session
      mockDb.insert.mockReturnValueOnce(chainInsert([mockSession]));

      const profile: OAuthProfile = {
        provider: 'google', providerId: 'g-brand-new',
        email: 'new@example.com', name: 'New User',
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      const result = await service.socialLogin(profile);

      expect(result.user.email).toBe('new@example.com');
      expect(result.tenant.status).toBe('trial');
      // Should have called insert 3 times: tenant, user, session
      expect(mockDb.insert).toHaveBeenCalledTimes(3);
    });

    it('should generate fallback email when OAuth profile has no email', async () => {
      mockDb.select.mockReturnValueOnce(chainSelect([]));
      // No email → skip email lookup, go straight to new user
      mockDb.insert.mockReturnValueOnce(chainInsert([{
        id: 'tenant-line', name: 'LINE User', slug: 'line-user-abc', status: 'trial',
      }]));
      mockDb.insert.mockReturnValueOnce(chainInsert([{
        id: 'user-line', email: 'line_line-123@oauth.local', role: 'owner', displayName: 'LINE User',
      }]));
      mockDb.insert.mockReturnValueOnce(chainInsert([mockSession]));

      const profile: OAuthProfile = {
        provider: 'line', providerId: 'line-123',
        name: 'LINE User',
        // no email
      };

      const result = await service.socialLogin(profile);

      expect(result.user).toBeDefined();
      expect(result.tenant).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should throw InternalServerErrorException on DB failure', async () => {
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockRejectedValue(new Error('DB connection lost')),
          }),
        }),
      });

      const profile: OAuthProfile = {
        provider: 'google', providerId: 'g-err',
        email: 'err@example.com',
      };

      await expect(service.socialLogin(profile)).rejects.toThrow(InternalServerErrorException);
    });
  });
});
