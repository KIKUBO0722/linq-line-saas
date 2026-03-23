import { Controller, Post, Get, Delete, Patch, Param, Body, Res, Req, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { InviteUserDto, UpdateRoleDto } from './dto/auth.dto';

const COOKIE_NAME = 'session_id';
const isLocal = (process.env.WEB_URL || '').includes('localhost');
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: !isLocal,
  sameSite: isLocal ? ('strict' as const) : ('none' as const),
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

@ApiTags('Auth')
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
        industry: result.tenant.industry,
        appName: result.tenant.appName,
        logoUrl: result.tenant.logoUrl,
        primaryColor: result.tenant.primaryColor,
        sidebarColor: result.tenant.sidebarColor,
        faviconUrl: result.tenant.faviconUrl,
      },
    };
  }

  // --- Team management ---

  @Get('team')
  @UseGuards(AuthGuard)
  async getTeam(@TenantId() tenantId: string) {
    return this.authService.getTeamMembers(tenantId);
  }

  @Post('invite')
  @UseGuards(AuthGuard)
  async invite(@TenantId() tenantId: string, @Body() body: InviteUserDto) {
    return this.authService.inviteUser(tenantId, body.email, body.role);
  }

  @Get('invitations')
  @UseGuards(AuthGuard)
  async listInvitations(@TenantId() tenantId: string) {
    return this.authService.listInvitations(tenantId);
  }

  @Delete('invitations/:id')
  @UseGuards(AuthGuard)
  async cancelInvitation(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.authService.cancelInvitation(tenantId, id);
  }

  @Post('accept-invite')
  async acceptInvite(
    @Body() body: { token: string; password: string; displayName?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.acceptInvitation(body.token, body.password, body.displayName);
    res.cookie(COOKIE_NAME, result.session.id, COOKIE_OPTIONS);
    return { user: result.user, tenant: result.tenant };
  }

  @Patch('team/:userId/role')
  @UseGuards(AuthGuard)
  async updateRole(
    @TenantId() tenantId: string,
    @Param('userId') userId: string,
    @Body() body: UpdateRoleDto,
  ) {
    return this.authService.updateUserRole(tenantId, userId, body.role);
  }

  @Delete('team/:userId')
  @UseGuards(AuthGuard)
  async removeMember(@TenantId() tenantId: string, @Param('userId') userId: string) {
    return this.authService.removeMember(tenantId, userId);
  }
}
