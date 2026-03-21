import { Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common';
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
}
