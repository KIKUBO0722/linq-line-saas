import { Controller, Get, Post, Delete, Query, Req, Res, Body, Param, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('api/v1/analytics')
@UseGuards(AuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  async overview(@Req() req: any) {
    return this.analyticsService.getOverview(req.tenantId);
  }

  @Get('broadcasts')
  async broadcasts(@Req() req: any) {
    return this.analyticsService.getBroadcastHistory(req.tenantId);
  }

  @Get('daily')
  async daily(@Req() req: any, @Query('days') days?: string) {
    return this.analyticsService.getDailyStats(req.tenantId, days ? parseInt(days, 10) : 14);
  }

  @Get('delivery')
  async delivery(@Req() req: any, @Query('date') date?: string) {
    const d = date || new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return this.analyticsService.getDeliveryInsight(req.tenantId, d);
  }

  @Get('daily/export/csv')
  async exportDailyCsv(@Req() req: any, @Res() res: any, @Query('days') days?: string) {
    const d = days ? parseInt(days, 10) : 14;
    const data = await this.analyticsService.getDailyStats(req.tenantId, d);

    // Merge all dates
    const dateSet = new Set<string>();
    for (const row of [...data.dailyOutbound, ...data.dailyInbound, ...data.dailyFriends]) {
      dateSet.add(row.date);
    }
    const dates = Array.from(dateSet).sort();

    const outMap = new Map(data.dailyOutbound.map((r: any) => [r.date, r.count]));
    const inMap = new Map(data.dailyInbound.map((r: any) => [r.date, r.count]));
    const friendMap = new Map(data.dailyFriends.map((r: any) => [r.date, r.count]));

    const header = '日付,送信メッセージ数,受信メッセージ数,新規友だち数\n';
    const rows = dates.map((date) =>
      `${date},${outMap.get(date) || 0},${inMap.get(date) || 0},${friendMap.get(date) || 0}`
    ).join('\n');

    const bom = '\uFEFF';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=analytics_daily_${new Date().toISOString().slice(0, 10)}.csv`);
    res.send(bom + header + rows);
  }

  @Get('traffic-sources')
  async listTrafficSources(@Req() req: any) {
    return this.analyticsService.getSourceStats(req.tenantId);
  }

  @Post('traffic-sources')
  async createTrafficSource(
    @Req() req: any,
    @Body() body: { name: string; utmSource?: string; utmMedium?: string; utmCampaign?: string },
  ) {
    return this.analyticsService.createTrafficSource(req.tenantId, body);
  }

  @Delete('traffic-sources/:id')
  async deleteTrafficSource(@Param('id') id: string) {
    await this.analyticsService.deleteTrafficSource(id);
    return { ok: true };
  }
}
