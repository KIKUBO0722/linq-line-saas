import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { DRIZZLE } from '../../database/database.module';

// Mock the Stripe module
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
    subscriptions: {
      cancel: jest.fn(),
    },
  }));
});

describe('BillingService', () => {
  let service: BillingService;
  let mockDb: Record<string, jest.Mock>;
  let configService: { get: jest.Mock };

  function createMockDb() {
    return {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
      orderBy: jest.fn().mockResolvedValue([]),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    };
  }

  describe('without Stripe key (fallback mode)', () => {
    beforeEach(async () => {
      mockDb = createMockDb();
      configService = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BillingService,
          { provide: DRIZZLE, useValue: mockDb },
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      service = module.get<BillingService>(BillingService);
    });

    it('should use fallback mode when STRIPE_SECRET_KEY is not set', async () => {
      const mockSubscription = {
        id: 'sub-1',
        tenantId: 'tenant-1',
        planId: 'plan-1',
        status: 'trialing',
      };
      mockDb.returning.mockResolvedValue([mockSubscription]);
      // update().set().where() for cancelling existing
      mockDb.where.mockResolvedValue(undefined);

      const result = await service.createCheckoutSession('tenant-1', 'plan-1');

      expect(result).toHaveProperty('fallback', true);
      expect(result).toHaveProperty('subscription');
    });
  });

  describe('with Stripe key', () => {
    beforeEach(async () => {
      mockDb = createMockDb();
      configService = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'STRIPE_SECRET_KEY') return 'sk_test_fake_key';
          if (key === 'WEB_URL') return 'https://app.example.com';
          return undefined;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BillingService,
          { provide: DRIZZLE, useValue: mockDb },
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      service = module.get<BillingService>(BillingService);
    });

    it('should throw NotFoundException when plan is not found', async () => {
      mockDb.limit.mockResolvedValue([]);

      await expect(service.createCheckoutSession('tenant-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should use fallback for free plan even when Stripe is configured', async () => {
      mockDb.limit.mockResolvedValueOnce([
        { id: 'free-plan', name: 'free', priceMonthly: 0 },
      ]);
      const mockSubscription = { id: 'sub-1', tenantId: 'tenant-1', planId: 'free-plan', status: 'trialing' };
      mockDb.returning.mockResolvedValue([mockSubscription]);

      const result = await service.createCheckoutSession('tenant-1', 'free-plan');

      expect(result).toHaveProperty('fallback', true);
      expect(result).toHaveProperty('subscription');
    });
  });

  describe('getUsage', () => {
    beforeEach(async () => {
      mockDb = createMockDb();
      configService = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BillingService,
          { provide: DRIZZLE, useValue: mockDb },
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      service = module.get<BillingService>(BillingService);
    });

    it('should return zero usage when no records exist', async () => {
      // Both usage and subscription return empty
      mockDb.limit.mockResolvedValue([]);

      const result = await service.getUsage('tenant-1');

      expect(result.messagesSent).toBe(0);
      expect(result.aiTokensUsed).toBe(0);
      expect(result.friendsCount).toBe(0);
    });

    it('should return correct limits when subscription and plan exist', async () => {
      let limitCallCount = 0;
      mockDb.limit.mockImplementation(() => {
        limitCallCount++;
        if (limitCallCount === 1) {
          // usage record
          return Promise.resolve([{ messagesSent: 150, aiTokensUsed: 30, friendsCount: 50, period: '2026-03' }]);
        }
        if (limitCallCount === 2) {
          // subscription
          return Promise.resolve([{ planId: 'plan-start', tenantId: 'tenant-1' }]);
        }
        if (limitCallCount === 3) {
          // plan
          return Promise.resolve([{ messageLimit: 5000, friendLimit: 500, aiTokenLimit: 500 }]);
        }
        return Promise.resolve([]);
      });

      const result = await service.getUsage('tenant-1');

      expect(result.messagesSent).toBe(150);
      expect(result.aiTokensUsed).toBe(30);
      expect(result.friendsCount).toBe(50);
      expect(result).toHaveProperty('messagesLimit', 5000);
      expect(result).toHaveProperty('friendsLimit', 500);
      expect(result).toHaveProperty('aiTokensLimit', 500);
    });

    it('should return null aiTokensLimit when plan has unlimited (-1)', async () => {
      let limitCallCount = 0;
      mockDb.limit.mockImplementation(() => {
        limitCallCount++;
        if (limitCallCount === 1) {
          return Promise.resolve([{ messagesSent: 0, aiTokensUsed: 0, friendsCount: 0, period: '2026-03' }]);
        }
        if (limitCallCount === 2) {
          return Promise.resolve([{ planId: 'plan-pro', tenantId: 'tenant-1' }]);
        }
        if (limitCallCount === 3) {
          return Promise.resolve([{ messageLimit: 100000, friendLimit: 50000, aiTokenLimit: -1 }]);
        }
        return Promise.resolve([]);
      });

      const result = await service.getUsage('tenant-1');

      expect(result).toHaveProperty('aiTokensLimit', null);
    });
  });

  describe('getSubscription', () => {
    beforeEach(async () => {
      mockDb = createMockDb();
      configService = { get: jest.fn().mockReturnValue(undefined) };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BillingService,
          { provide: DRIZZLE, useValue: mockDb },
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      service = module.get<BillingService>(BillingService);
    });

    it('should return null when no subscription exists', async () => {
      mockDb.limit.mockResolvedValue([]);
      const result = await service.getSubscription('tenant-1');
      expect(result).toBeNull();
    });

    it('should return subscription with plan name', async () => {
      let limitCallCount = 0;
      mockDb.limit.mockImplementation(() => {
        limitCallCount++;
        if (limitCallCount === 1) {
          return Promise.resolve([{ id: 'sub-1', tenantId: 'tenant-1', planId: 'plan-1', status: 'active' }]);
        }
        if (limitCallCount === 2) {
          return Promise.resolve([{ id: 'plan-1', name: 'start' }]);
        }
        return Promise.resolve([]);
      });

      const result = await service.getSubscription('tenant-1');

      expect(result).not.toBeNull();
      expect(result!.planName).toBe('start');
      expect(result!.status).toBe('active');
    });
  });
});
