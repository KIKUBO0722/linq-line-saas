import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { AuthService } from './auth.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authService: { validateSession: jest.Mock };

  beforeEach(async () => {
    authService = {
      validateSession: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
  });

  function createMockContext(cookies: Record<string, string> = {}): ExecutionContext {
    const request = { cookies };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('should throw UnauthorizedException when session_id cookie is missing', async () => {
    const context = createMockContext({});
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(context)).rejects.toThrow('Authentication required');
  });

  it('should throw UnauthorizedException when cookies object is undefined', async () => {
    const request = {};
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when session is invalid', async () => {
    authService.validateSession.mockResolvedValue(null);
    const context = createMockContext({ session_id: 'invalid-session-id' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired session');
    expect(authService.validateSession).toHaveBeenCalledWith('invalid-session-id');
  });

  it('should return true and attach user/tenant to request when session is valid', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com', role: 'owner' };
    const mockTenant = { id: 'tenant-1', name: 'Test Tenant', slug: 'test' };
    authService.validateSession.mockResolvedValue({ user: mockUser, tenant: mockTenant });

    const request: Record<string, unknown> = { cookies: { session_id: 'valid-session' } };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toEqual(mockUser);
    expect(request.tenant).toEqual(mockTenant);
    expect(request.tenantId).toBe('tenant-1');
    expect(authService.validateSession).toHaveBeenCalledWith('valid-session');
  });

  it('should call validateSession exactly once per request', async () => {
    authService.validateSession.mockResolvedValue(null);
    const context = createMockContext({ session_id: 'some-session' });

    try {
      await guard.canActivate(context);
    } catch {
      // expected
    }

    expect(authService.validateSession).toHaveBeenCalledTimes(1);
  });
});
