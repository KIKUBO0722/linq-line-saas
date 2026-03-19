import { Controller, Post, Get, Body, Res, Req, HttpCode, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';

const COOKIE_NAME = 'session_id';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(
    @Body() body: { email: string; password: string; tenantName: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signup(body.email, body.password, body.tenantName);
    res.cookie(COOKIE_NAME, result.session.id, COOKIE_OPTIONS);
    return { user: result.user, tenant: result.tenant };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(body.email, body.password);
    res.cookie(COOKIE_NAME, result.session.id, COOKIE_OPTIONS);
    return { user: result.user, tenant: result.tenant };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sessionId = req.cookies?.[COOKIE_NAME];
    if (sessionId) {
      await this.authService.logout(sessionId);
    }
    res.clearCookie(COOKIE_NAME);
    return { ok: true };
  }

  @Get('me')
  async me(@Req() req: Request) {
    const sessionId = req.cookies?.[COOKIE_NAME];
    if (!sessionId) {
      return { user: null, tenant: null };
    }

    const result = await this.authService.validateSession(sessionId);
    if (!result) {
      return { user: null, tenant: null };
    }

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        displayName: result.user.displayName,
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        status: result.tenant.status,
      },
    };
  }
}
