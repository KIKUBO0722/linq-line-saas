import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../modules/auth/auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const sessionId = request.cookies?.session_id;

    if (!sessionId) {
      throw new UnauthorizedException('Authentication required');
    }

    const result = await this.authService.validateSession(sessionId);
    if (!result) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Attach user and tenant to request
    request.user = result.user;
    request.tenant = result.tenant;
    request.tenantId = result.tenant.id;

    return true;
  }
}
