import { Test, TestingModule } from '@nestjs/testing';
import { WebhookService } from './webhook.service';
import { LineService } from '../line/line.service';
import { FollowHandler } from './handlers/follow.handler';
import { UnfollowHandler } from './handlers/unfollow.handler';
import { MessageHandler } from './handlers/message.handler';
import { DRIZZLE } from '../../database/database.module';

describe('WebhookService', () => {
  let service: WebhookService;
  let mockDb: Record<string, jest.Mock>;
  let lineService: { validateWebhookSignature: jest.Mock };
  let followHandler: { handle: jest.Mock };
  let unfollowHandler: { handle: jest.Mock };
  let messageHandler: { handle: jest.Mock };

  const mockAccount = {
    id: 'account-1',
    tenantId: 'tenant-1',
    channelSecret: 'test-channel-secret',
    channelAccessToken: 'test-access-token',
  };

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockResolvedValue(undefined),
    };

    lineService = {
      validateWebhookSignature: jest.fn(),
    };

    followHandler = { handle: jest.fn().mockResolvedValue(undefined) };
    unfollowHandler = { handle: jest.fn().mockResolvedValue(undefined) };
    messageHandler = { handle: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: LineService, useValue: lineService },
        { provide: FollowHandler, useValue: followHandler },
        { provide: UnfollowHandler, useValue: unfollowHandler },
        { provide: MessageHandler, useValue: messageHandler },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
  });

  describe('processWebhook', () => {
    it('should return early when LINE account is not found', async () => {
      mockDb.limit.mockResolvedValue([]);

      const rawBody = Buffer.from(JSON.stringify({ events: [] }));
      await service.processWebhook('nonexistent-account', rawBody, 'some-signature');

      expect(lineService.validateWebhookSignature).not.toHaveBeenCalled();
    });

    it('should return early when signature is invalid', async () => {
      mockDb.limit.mockResolvedValue([mockAccount]);
      lineService.validateWebhookSignature.mockReturnValue(false);

      const rawBody = Buffer.from(JSON.stringify({ events: [{ type: 'follow' }] }));
      await service.processWebhook('account-1', rawBody, 'invalid-signature');

      expect(lineService.validateWebhookSignature).toHaveBeenCalledWith(
        rawBody,
        'invalid-signature',
        'test-channel-secret',
      );
      expect(followHandler.handle).not.toHaveBeenCalled();
    });

    it('should process follow events with valid signature', async () => {
      mockDb.limit.mockResolvedValue([mockAccount]);
      lineService.validateWebhookSignature.mockReturnValue(true);

      const events = [
        {
          type: 'follow',
          webhookEventId: 'evt-1',
          source: { userId: 'user-1', type: 'user' },
          replyToken: 'reply-token-1',
        },
      ];
      const rawBody = Buffer.from(JSON.stringify({ events }));

      await service.processWebhook('account-1', rawBody, 'valid-signature');

      expect(followHandler.handle).toHaveBeenCalledTimes(1);
      expect(followHandler.handle).toHaveBeenCalledWith(
        events[0],
        mockAccount,
        { channelSecret: 'test-channel-secret', channelAccessToken: 'test-access-token' },
      );
    });

    it('should process unfollow events', async () => {
      mockDb.limit.mockResolvedValue([mockAccount]);
      lineService.validateWebhookSignature.mockReturnValue(true);

      const events = [{ type: 'unfollow', source: { userId: 'user-1' } }];
      const rawBody = Buffer.from(JSON.stringify({ events }));

      await service.processWebhook('account-1', rawBody, 'valid-signature');

      expect(unfollowHandler.handle).toHaveBeenCalledTimes(1);
      expect(unfollowHandler.handle).toHaveBeenCalledWith(events[0], mockAccount);
    });

    it('should process message events', async () => {
      mockDb.limit.mockResolvedValue([mockAccount]);
      lineService.validateWebhookSignature.mockReturnValue(true);

      const events = [
        {
          type: 'message',
          source: { userId: 'user-1' },
          message: { type: 'text', text: 'Hello' },
        },
      ];
      const rawBody = Buffer.from(JSON.stringify({ events }));

      await service.processWebhook('account-1', rawBody, 'valid-signature');

      expect(messageHandler.handle).toHaveBeenCalledTimes(1);
    });

    it('should process multiple events in sequence', async () => {
      mockDb.limit.mockResolvedValue([mockAccount]);
      lineService.validateWebhookSignature.mockReturnValue(true);

      const events = [
        { type: 'follow', source: { userId: 'user-1' } },
        { type: 'message', source: { userId: 'user-2' }, message: { type: 'text', text: 'Hi' } },
        { type: 'unfollow', source: { userId: 'user-3' } },
      ];
      const rawBody = Buffer.from(JSON.stringify({ events }));

      await service.processWebhook('account-1', rawBody, 'valid-signature');

      expect(followHandler.handle).toHaveBeenCalledTimes(1);
      expect(messageHandler.handle).toHaveBeenCalledTimes(1);
      expect(unfollowHandler.handle).toHaveBeenCalledTimes(1);
    });

    it('should store webhook event in database for each event', async () => {
      mockDb.limit.mockResolvedValue([mockAccount]);
      lineService.validateWebhookSignature.mockReturnValue(true);

      const events = [{ type: 'follow', webhookEventId: 'evt-1', source: { userId: 'user-1' } }];
      const rawBody = Buffer.from(JSON.stringify({ events }));

      await service.processWebhook('account-1', rawBody, 'valid-signature');

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          lineAccountId: 'account-1',
          eventType: 'follow',
          lineEventId: 'evt-1',
          sourceUserId: 'user-1',
        }),
      );
    });

    it('should handle empty events array gracefully', async () => {
      mockDb.limit.mockResolvedValue([mockAccount]);
      lineService.validateWebhookSignature.mockReturnValue(true);

      const rawBody = Buffer.from(JSON.stringify({ events: [] }));
      await service.processWebhook('account-1', rawBody, 'valid-signature');

      expect(followHandler.handle).not.toHaveBeenCalled();
      expect(messageHandler.handle).not.toHaveBeenCalled();
      expect(unfollowHandler.handle).not.toHaveBeenCalled();
    });

    it('should not call any handler for unknown event types', async () => {
      mockDb.limit.mockResolvedValue([mockAccount]);
      lineService.validateWebhookSignature.mockReturnValue(true);

      const events = [{ type: 'beacon', source: { userId: 'user-1' } }];
      const rawBody = Buffer.from(JSON.stringify({ events }));

      await service.processWebhook('account-1', rawBody, 'valid-signature');

      expect(followHandler.handle).not.toHaveBeenCalled();
      expect(messageHandler.handle).not.toHaveBeenCalled();
      expect(unfollowHandler.handle).not.toHaveBeenCalled();
    });
  });
});
