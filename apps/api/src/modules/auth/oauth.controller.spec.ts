import { Test, TestingModule } from '@nestjs/testing';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';
import { AuthService } from './auth.service';

describe('OAuthController', () => {
  let controller: OAuthController;
  let oauthService: { getGoogleAuthUrl: jest.Mock; handleGoogleCallback: jest.Mock; getLineAuthUrl: jest.Mock; handleLineCallback: jest.Mock };
  let authService: { socialLogin: jest.Mock };

  beforeEach(async () => {
    oauthService = {
      getGoogleAuthUrl: jest.fn(),
      handleGoogleCallback: jest.fn(),
      getLineAuthUrl: jest.fn(),
      handleLineCallback: jest.fn(),
    };
    authService = {
      socialLogin: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OAuthController],
      providers: [
        { provide: OAuthService, useValue: oauthService },
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    controller = module.get<OAuthController>(OAuthController);
  });

  function createMockResponse() {
    const res = {
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis(),
    } as unknown as Record<string, jest.Mock>;
    return res;
  }

  function createMockRequest(cookies: Record<string, string> = {}) {
    return { cookies } as unknown as Record<string, unknown>;
  }

  // --- Google OAuth ---

  describe('googleAuth', () => {
    it('should set state cookie and redirect to Google', () => {
      const res = createMockResponse();
      oauthService.getGoogleAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/auth?state=abc');

      controller.googleAuth(res as any);

      expect(res.cookie).toHaveBeenCalledWith(
        'oauth_state',
        expect.any(String),
        expect.objectContaining({ httpOnly: true, maxAge: 600000 }),
      );
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('accounts.google.com'));
    });
  });

  describe('googleCallback', () => {
    it('should reject when code is missing', async () => {
      const req = createMockRequest({ oauth_state: 'valid-state' });
      const res = createMockResponse();

      await controller.googleCallback('', 'valid-state', req as any, res as any);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error=oauth_cancelled'));
    });

    it('should reject when state cookie is missing (CSRF protection)', async () => {
      const req = createMockRequest({}); // no oauth_state cookie
      const res = createMockResponse();

      await controller.googleCallback('auth-code', 'some-state', req as any, res as any);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error=invalid_state'));
      expect(oauthService.handleGoogleCallback).not.toHaveBeenCalled();
    });

    it('should reject when state does not match cookie (CSRF protection)', async () => {
      const req = createMockRequest({ oauth_state: 'correct-state' });
      const res = createMockResponse();

      await controller.googleCallback('auth-code', 'wrong-state', req as any, res as any);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error=invalid_state'));
      expect(oauthService.handleGoogleCallback).not.toHaveBeenCalled();
    });

    it('should succeed when state matches and clear the state cookie', async () => {
      const stateValue = 'matching-state';
      const req = createMockRequest({ oauth_state: stateValue });
      const res = createMockResponse();

      const mockProfile = { provider: 'google', providerId: 'g-123', email: 'test@example.com' };
      const mockResult = { session: { id: 'sess-123' }, user: {}, tenant: {} };
      oauthService.handleGoogleCallback.mockResolvedValue(mockProfile);
      authService.socialLogin.mockResolvedValue(mockResult);

      await controller.googleCallback('auth-code', stateValue, req as any, res as any);

      expect(res.clearCookie).toHaveBeenCalledWith('oauth_state');
      expect(oauthService.handleGoogleCallback).toHaveBeenCalledWith('auth-code');
      expect(authService.socialLogin).toHaveBeenCalledWith(mockProfile);
      expect(res.cookie).toHaveBeenCalledWith('session_id', 'sess-123', expect.any(Object));
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/overview'));
    });

    it('should redirect to login with error when OAuth provider fails', async () => {
      const stateValue = 'valid-state';
      const req = createMockRequest({ oauth_state: stateValue });
      const res = createMockResponse();

      oauthService.handleGoogleCallback.mockRejectedValue(new Error('Token exchange failed'));

      await controller.googleCallback('auth-code', stateValue, req as any, res as any);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error=oauth_failed'));
    });
  });

  // --- LINE OAuth ---

  describe('lineAuth', () => {
    it('should set state cookie and redirect to LINE', () => {
      const res = createMockResponse();
      oauthService.getLineAuthUrl.mockReturnValue('https://access.line.me/oauth2/v2.1/authorize?state=abc');

      controller.lineAuth(res as any);

      expect(res.cookie).toHaveBeenCalledWith(
        'oauth_state',
        expect.any(String),
        expect.objectContaining({ httpOnly: true }),
      );
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('line.me'));
    });
  });

  describe('lineCallback', () => {
    it('should reject when state does not match cookie (CSRF protection)', async () => {
      const req = createMockRequest({ oauth_state: 'correct-state' });
      const res = createMockResponse();

      await controller.lineCallback('auth-code', 'wrong-state', req as any, res as any);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error=invalid_state'));
      expect(oauthService.handleLineCallback).not.toHaveBeenCalled();
    });

    it('should reject when state cookie is missing (CSRF protection)', async () => {
      const req = createMockRequest({});
      const res = createMockResponse();

      await controller.lineCallback('auth-code', 'some-state', req as any, res as any);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error=invalid_state'));
    });

    it('should succeed when state matches', async () => {
      const stateValue = 'matching-state';
      const req = createMockRequest({ oauth_state: stateValue });
      const res = createMockResponse();

      const mockProfile = { provider: 'line', providerId: 'line-123', name: 'Test User' };
      const mockResult = { session: { id: 'sess-456' }, user: {}, tenant: {} };
      oauthService.handleLineCallback.mockResolvedValue(mockProfile);
      authService.socialLogin.mockResolvedValue(mockResult);

      await controller.lineCallback('auth-code', stateValue, req as any, res as any);

      expect(res.clearCookie).toHaveBeenCalledWith('oauth_state');
      expect(res.cookie).toHaveBeenCalledWith('session_id', 'sess-456', expect.any(Object));
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/overview'));
    });
  });
});
