import { Controller, Get, Query, Res, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { randomBytes } from 'crypto';
import { OAuthService } from './oauth.service';
import { AuthService } from './auth.service';

const COOKIE_NAME = 'session_id';
const isLocal = (process.env.WEB_URL || '').includes('localhost');
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: !isLocal,
  sameSite: isLocal ? ('strict' as const) : ('none' as const),
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

const STATE_COOKIE = 'oauth_state';
const STATE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: !isLocal,
  sameSite: 'lax' as const,
  maxAge: 10 * 60 * 1000, // 10 minutes
  path: '/',
};

@ApiTags('OAuth')
@Controller('api/v1/auth')
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);

  constructor(
    private readonly oauthService: OAuthService,
    private readonly authService: AuthService,
  ) {}

  private getWebUrl(): string {
    return process.env.WEB_URL || 'http://localhost:3600';
  }

  // --- Google OAuth ---

  @Get('google')
  googleAuth(@Res() res: Response) {
    const state = randomBytes(16).toString('hex');
    res.cookie(STATE_COOKIE, state, STATE_COOKIE_OPTIONS);
    const url = this.oauthService.getGoogleAuthUrl(state);
    res.redirect(url);
  }

  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      if (!code) {
        return res.redirect(`${this.getWebUrl()}/login?error=oauth_cancelled`);
      }

      const profile = await this.oauthService.handleGoogleCallback(code);
      const result = await this.authService.socialLogin(profile);

      res.cookie(COOKIE_NAME, result.session.id, COOKIE_OPTIONS);
      res.redirect(`${this.getWebUrl()}/overview`);
    } catch (error) {
      this.logger.error(`Google OAuth callback failed: ${error}`);
      res.redirect(`${this.getWebUrl()}/login?error=oauth_failed`);
    }
  }

  // --- LINE Login ---

  @Get('line')
  lineAuth(@Res() res: Response) {
    const state = randomBytes(16).toString('hex');
    res.cookie(STATE_COOKIE, state, STATE_COOKIE_OPTIONS);
    const url = this.oauthService.getLineAuthUrl(state);
    res.redirect(url);
  }

  @Get('line/callback')
  async lineCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      if (!code) {
        return res.redirect(`${this.getWebUrl()}/login?error=oauth_cancelled`);
      }

      const profile = await this.oauthService.handleLineCallback(code);
      const result = await this.authService.socialLogin(profile);

      res.cookie(COOKIE_NAME, result.session.id, COOKIE_OPTIONS);
      res.redirect(`${this.getWebUrl()}/overview`);
    } catch (error) {
      this.logger.error(`LINE OAuth callback failed: ${error}`);
      res.redirect(`${this.getWebUrl()}/login?error=oauth_failed`);
    }
  }
}
