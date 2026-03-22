import { Controller, Get, Post, Put, Delete, Body, Param, Req, Res, UseGuards } from '@nestjs/common';
import { UrlTrackingService } from './url-tracking.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller()
export class UrlTrackingController {
  constructor(private readonly urlTrackingService: UrlTrackingService) {}

  // Public redirect endpoint - no auth
  @Get('t/:shortCode')
  async redirect(@Param('shortCode') shortCode: string, @Req() req: any, @Res() res: any) {
    const tracked = await this.urlTrackingService.recordClick(shortCode, undefined, req.headers['user-agent']);
    if (!tracked) {
      return res.status(404).send('Not found');
    }
    return res.redirect(302, tracked.originalUrl);
  }

  // Create tracked URL - requires auth
  @Post('api/v1/url-tracking')
  @UseGuards(AuthGuard)
  async create(@Req() req: any, @Body() body: { originalUrl: string; messageId?: string }) {
    return this.urlTrackingService.createTrackedUrl(req.tenantId, body.originalUrl, body.messageId);
  }

  // List tracked URLs - requires auth
  @Get('api/v1/url-tracking')
  @UseGuards(AuthGuard)
  async list(@Req() req: any) {
    return this.urlTrackingService.listTrackedUrls(req.tenantId);
  }

  // Get URL click stats
  @Get('api/v1/url-tracking/:id/clicks')
  @UseGuards(AuthGuard)
  async clicks(@Param('id') id: string) {
    return this.urlTrackingService.getUrlStats(id);
  }

  // Update tracked URL - requires auth
  @Put('api/v1/url-tracking/:id')
  @UseGuards(AuthGuard)
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { originalUrl?: string },
  ) {
    return this.urlTrackingService.updateTrackedUrl(req.tenantId, id, body);
  }

  // Delete tracked URL - requires auth
  @Delete('api/v1/url-tracking/:id')
  @UseGuards(AuthGuard)
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.urlTrackingService.deleteTrackedUrl(req.tenantId, id);
  }
}
