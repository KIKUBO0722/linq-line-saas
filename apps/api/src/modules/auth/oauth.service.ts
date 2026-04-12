import { Injectable, Logger } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import type { OAuthProfile } from './dto/oauth.dto';

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);
  private googleClient: OAuth2Client | null = null;

  private getGoogleClient(): OAuth2Client {
    if (!this.googleClient) {
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        throw new Error('Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
      }
      this.googleClient = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.OAUTH_CALLBACK_BASE_URL || 'http://localhost:3601'}/api/v1/auth/google/callback`,
      );
    }
    return this.googleClient;
  }

  // --- Google OAuth ---

  getGoogleAuthUrl(state: string): string {
    const client = this.getGoogleClient();
    return client.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      state,
      prompt: 'select_account',
    });
  }

  async handleGoogleCallback(code: string): Promise<OAuthProfile> {
    const client = this.getGoogleClient();
    const { tokens } = await client.getToken(code);

    if (!tokens.id_token) {
      throw new Error('Google OAuth: No ID token received');
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Google OAuth: Invalid ID token payload');
    }

    this.logger.log(`Google OAuth: user ${payload.email} authenticated`);

    return {
      provider: 'google',
      providerId: payload.sub,
      email: payload.email,
      name: payload.name,
      avatarUrl: payload.picture,
    };
  }

  // --- LINE Login ---

  getLineAuthUrl(state: string): string {
    const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
    if (!channelId || !process.env.LINE_LOGIN_CHANNEL_SECRET) {
      throw new Error('LINE Login is not configured. Set LINE_LOGIN_CHANNEL_ID and LINE_LOGIN_CHANNEL_SECRET.');
    }
    const callbackUrl = `${process.env.OAUTH_CALLBACK_BASE_URL || 'http://localhost:3601'}/api/v1/auth/line/callback`;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: channelId || '',
      redirect_uri: callbackUrl,
      state,
      scope: 'profile openid email',
    });

    return `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
  }

  async handleLineCallback(code: string): Promise<OAuthProfile> {
    const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
    const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET;
    const callbackUrl = `${process.env.OAUTH_CALLBACK_BASE_URL || 'http://localhost:3601'}/api/v1/auth/line/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUrl,
        client_id: channelId || '',
        client_secret: channelSecret || '',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      this.logger.error(`LINE token exchange failed: ${err}`);
      throw new Error('LINE OAuth: Token exchange failed');
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Get user profile
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      throw new Error('LINE OAuth: Profile fetch failed');
    }

    const profile = await profileRes.json();

    // Extract email from ID token if available
    let email: string | undefined;
    if (tokenData.id_token) {
      try {
        const payload = JSON.parse(
          Buffer.from(tokenData.id_token.split('.')[1], 'base64').toString(),
        );
        email = payload.email;
      } catch {
        this.logger.warn('LINE OAuth: Failed to decode ID token for email');
      }
    }

    this.logger.log(`LINE OAuth: user ${profile.displayName} (${profile.userId}) authenticated`);

    return {
      provider: 'line',
      providerId: profile.userId,
      email,
      name: profile.displayName,
      avatarUrl: profile.pictureUrl,
    };
  }
}
