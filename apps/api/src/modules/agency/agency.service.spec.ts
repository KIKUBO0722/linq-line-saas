import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AgencyService } from './agency.service';
import { DRIZZLE } from '../../database/database.module';

describe('AgencyService', () => {
  let service: AgencyService;
  let mockDb: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
      orderBy: jest.fn().mockResolvedValue([]),
      innerJoin: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgencyService,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();

    service = module.get<AgencyService>(AgencyService);
  });

  describe('isAgency', () => {
    it('should return true when child tenants exist', async () => {
      mockDb.where.mockResolvedValue([{ count: 3 }]);

      const result = await service.isAgency('agency-tenant-1');
      expect(result).toBe(true);
    });

    it('should return false when no child tenants exist', async () => {
      mockDb.where.mockResolvedValue([{ count: 0 }]);

      const result = await service.isAgency('non-agency-tenant');
      expect(result).toBe(false);
    });

    it('should return false when count is string "0"', async () => {
      mockDb.where.mockResolvedValue([{ count: '0' }]);

      const result = await service.isAgency('non-agency-tenant');
      expect(result).toBe(false);
    });
  });

  describe('addClient', () => {
    it('should throw ForbiddenException when client is not found', async () => {
      mockDb.limit.mockResolvedValue([]);

      await expect(service.addClient('agency-1', 'nonexistent-client')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when client belongs to another agency', async () => {
      mockDb.limit.mockResolvedValue([
        { id: 'client-1', parentTenantId: 'other-agency' },
      ]);

      await expect(service.addClient('agency-1', 'client-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should succeed when client has no parent agency', async () => {
      mockDb.limit.mockResolvedValue([
        { id: 'client-1', parentTenantId: null },
      ]);

      await expect(service.addClient('agency-1', 'client-1')).resolves.not.toThrow();
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should succeed when client already belongs to the same agency', async () => {
      mockDb.limit.mockResolvedValue([
        { id: 'client-1', parentTenantId: 'agency-1' },
      ]);

      await expect(service.addClient('agency-1', 'client-1')).resolves.not.toThrow();
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('setMargin', () => {
    it('should throw NotFoundException when client does not belong to this agency', async () => {
      // First limit call returns empty (client not found for this agency)
      mockDb.limit.mockResolvedValue([]);

      await expect(
        service.setMargin('agency-1', 'client-1', {
          marginType: 'percentage',
          marginValue: 20,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create new margin when none exists', async () => {
      // First call: client lookup returns a match
      // Second call: existing margin lookup returns empty
      let limitCallCount = 0;
      mockDb.limit.mockImplementation(() => {
        limitCallCount++;
        if (limitCallCount === 1) {
          return Promise.resolve([{ id: 'client-1', parentTenantId: 'agency-1' }]);
        }
        return Promise.resolve([]);
      });
      mockDb.values.mockReturnThis();

      await service.setMargin('agency-1', 'client-1', {
        marginType: 'percentage',
        marginValue: 25,
        notes: 'Test note',
      });

      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should update existing margin when one exists', async () => {
      let limitCallCount = 0;
      mockDb.limit.mockImplementation(() => {
        limitCallCount++;
        if (limitCallCount === 1) {
          return Promise.resolve([{ id: 'client-1', parentTenantId: 'agency-1' }]);
        }
        return Promise.resolve([{ id: 'margin-1', marginType: 'percentage', marginValue: '20' }]);
      });

      await service.setMargin('agency-1', 'client-1', {
        marginType: 'fixed',
        marginValue: 5000,
      });

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('removeClient', () => {
    it('should call update with parentTenantId null', async () => {
      mockDb.where.mockResolvedValue(undefined);

      await service.removeClient('agency-1', 'client-1');

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith({ parentTenantId: null });
    });
  });
});
