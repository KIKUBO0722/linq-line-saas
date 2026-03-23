import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SegmentsService } from './segments.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CreateSegmentDto, BroadcastSegmentDto } from './dto/segments.dto';

@ApiTags('Segments')
@Controller('api/v1/segments')
@UseGuards(AuthGuard)
export class SegmentsController {
  constructor(private readonly segmentsService: SegmentsService) {}

  @Get()
  async list(@TenantId() tenantId: string) {
    return this.segmentsService.list(tenantId);
  }

  @Post()
  async create(@TenantId() tenantId: string, @Body() body: CreateSegmentDto) {
    return this.segmentsService.create(tenantId, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.segmentsService.delete(id);
    return { ok: true };
  }

  @Post(':id/preview')
  async preview(@TenantId() tenantId: string, @Param('id') id: string) {
    const segments = await this.segmentsService.list(tenantId);
    const segment = segments.find((s: { id: string }) => s.id === id);
    if (!segment) return { count: 0, friends: [] };

    const matchingFriends = await this.segmentsService.getMatchingFriends(
      tenantId,
      segment.tagIds,
      segment.matchType,
      segment.excludeTagIds,
    );
    return { count: matchingFriends.length, friends: matchingFriends };
  }

  @Post(':id/broadcast')
  async broadcast(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: BroadcastSegmentDto) {
    return this.segmentsService.broadcast(tenantId, id, body.message);
  }
}
