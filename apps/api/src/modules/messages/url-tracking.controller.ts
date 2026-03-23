import { Controller, Get, Post, Put, Delete, Body, Param, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UrlTrackingService } from './url-tracking.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CreateTrackedUrlDto, UpdateTrackedUrlDto } from './dto/url-tracking.dto';

@ApiTags('Messages')
@Controller()
export class UrlTrackingController {
  constructor(private readonly urlTrackingService: UrlTrackingService) {}

  // Public redirect endpoint - no auth
  @Get('t/:shortCode')
  async redirect(
    @Param('shortCode') shortCode: string,
    @Req() req: { headers: Record<string, string | string[] | undefined> },
    @Res() res: { status: (code: number) => { send: (msg: string) => void }; redirect: (code: number, url: string) => void },
  ) {
    const tracked = await this.urlTrackingService.recordClick(shortCode, undefined, req.headers['user-agent'] as string | undefined);
    if (!tracked) {
      return res.status(404).send('Not found');
    }
    return res.redirect(302, tracked.originalUrl);
  }

  @Post('api/v1/url-tracking')
  @UseGuards(AuthGuard)
  async create(@TenantId() tenantId: string, @Body() body: CreateTrackedUrlDto) {
    return this.urlTrackingService.createTrackedUrl(tenantId, body.originalUrl, body.messageId);
  }

  @Get('api/v1/url-tracking')
  @UseGuards(AuthGuard)
  async list(@TenantId() tenantId: string) {
    return this.urlTrackingService.listTrackedUrls(tenantId);
  }

  @Get('api/v1/url-tracking/:id/clicks')
  @UseGuards(AuthGuard)
  async clicks(@Param('id') id: string) {
    return this.urlTrackingService.getUrlStats(id);
  }

  @Put('api/v1/url-tracking/:id')
  @UseGuards(AuthGuard)
  async update(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: UpdateTrackedUrlDto) {
    return this.urlTrackingService.updateTrackedUrl(tenantId, id, body);
  }

  @Delete('api/v1/url-tracking/:id')
  @UseGuards(AuthGuard)
  async remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.urlTrackingService.deleteTrackedUrl(tenantId, id);
  }
}
