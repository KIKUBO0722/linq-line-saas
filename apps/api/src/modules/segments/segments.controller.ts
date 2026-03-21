import { Controller, Get, Post, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { SegmentsService } from './segments.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('api/v1/segments')
@UseGuards(AuthGuard)
export class SegmentsController {
  constructor(private readonly segmentsService: SegmentsService) {}

  @Get()
  async list(@Req() req: any) {
    return this.segmentsService.list(req.tenantId);
  }

  @Post()
  async create(@Req() req: any, @Body() body: { name: string; description?: string; tagIds: string[]; matchType?: string; excludeTagIds?: string[] }) {
    return this.segmentsService.create(req.tenantId, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.segmentsService.delete(id);
    return { ok: true };
  }

  @Post(':id/preview')
  async preview(@Req() req: any, @Param('id') id: string) {
    const segments = await this.segmentsService.list(req.tenantId);
    const segment = segments.find((s: any) => s.id === id);
    if (!segment) return { count: 0, friends: [] };

    const matchingFriends = await this.segmentsService.getMatchingFriends(
      req.tenantId,
      segment.tagIds,
      segment.matchType,
      segment.excludeTagIds,
    );
    return { count: matchingFriends.length, friends: matchingFriends };
  }

  @Post(':id/broadcast')
  async broadcast(@Req() req: any, @Param('id') id: string, @Body() body: { message: string }) {
    return this.segmentsService.broadcast(req.tenantId, id, body.message);
  }
}
