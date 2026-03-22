import { Controller, Get, Post, Delete, Query, Res, Body, Param, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CreateTrafficSourceDto } from './dto/analytics.dto';

@Controller('api/v1/analytics')
@UseGuards(AuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  async overview(@TenantId() tenantId: string) {
    return this.analyticsService.getOverview(tenantId);
  }

  @Get('broadcasts')
  async broadcasts(@TenantId() tenantId: string) {
    return this.analyticsService.getBroadcastHistory(tenantId);
  }

  @Get('daily')
  async daily(@TenantId() tenantId: string, @Query('days') days?: string) {
    return this.analyticsService.getDailyStats(tenantId, days ? parseInt(days, 10) : 14);
  }

  @Get('delivery')
  async delivery(@TenantId() tenantId: string, @Query('date') date?: string) {
    const d = date || new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return this.analyticsService.getDeliveryInsight(tenantId, d);
  }

  @Get('daily/export/csv')
  async exportDailyCsv(@TenantId() tenantId: string, @Res() res: { setHeader: (k: string, v: string) => void; send: (d: string) => void }, @Query('days') days?: string) {
    const d = days ? parseInt(days, 10) : 14;
    const data = await this.analyticsService.getDailyStats(tenantId, d);

    const dateSet = new Set<string>();
    for (const row of [...data.dailyOutbound, ...data.dailyInbound, ...data.dailyFriends]) {
      dateSet.add(row.date);
    }
    const dates = Array.from(dateSet).sort();

    const outMap = new Map(data.dailyOutbound.map((r: { date: string; count: number }) => [r.date, r.count]));
    const inMap = new Map(data.dailyInbound.map((r: { date: string; count: number }) => [r.date, r.count]));
    const friendMap = new Map(data.dailyFriends.map((r: { date: string; count: number }) => [r.date, r.count]));

    const header = '日付,送信メッセージ数,受信メッセージ数,新規友だち数\n';
    const rows = dates.map((date) =>
      `${date},${outMap.get(date) || 0},${inMap.get(date) || 0},${friendMap.get(date) || 0}`
    ).join('\n');

    const bom = '\uFEFF';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=analytics_daily_${new Date().toISOString().slice(0, 10)}.csv`);
    res.send(bom + header + rows);
  }

  @Get('cohort')
  async cohort(@TenantId() tenantId: string, @Query('weeks') weeks?: string) {
    return this.analyticsService.getCohortAnalysis(tenantId, weeks ? parseInt(weeks, 10) : 8);
  }

  @Get('ctr')
  async ctr(@TenantId() tenantId: string, @Query('days') days?: string) {
    return this.analyticsService.getPseudoCtr(tenantId, days ? parseInt(days, 10) : 30);
  }

  @Get('best-send-time')
  async bestSendTime(@TenantId() tenantId: string, @Query('days') days?: string) {
    return this.analyticsService.getBestSendTime(tenantId, days ? parseInt(days, 10) : 30);
  }

  @Get('segments')
  async segments(@TenantId() tenantId: string) {
    return this.analyticsService.getSegmentComparison(tenantId);
  }

  @Get('kpi')
  async kpi(@TenantId() tenantId: string) {
    return this.analyticsService.getKpiWithComparison(tenantId);
  }

  @Get('traffic-sources')
  async listTrafficSources(@TenantId() tenantId: string) {
    return this.analyticsService.getSourceStats(tenantId);
  }

  @Post('traffic-sources')
  async createTrafficSource(@TenantId() tenantId: string, @Body() body: CreateTrafficSourceDto) {
    return this.analyticsService.createTrafficSource(tenantId, body);
  }

  @Delete('traffic-sources/:id')
  async deleteTrafficSource(@Param('id') id: string) {
    await this.analyticsService.deleteTrafficSource(id);
    return { ok: true };
  }
}
