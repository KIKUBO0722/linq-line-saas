import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SegmentsService } from './segments.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CreateSegmentDto, UpdateSegmentDto, BroadcastSegmentDto } from './dto/segments.dto';

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

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateSegmentDto) {
    return this.segmentsService.update(id, body);
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
    if (!segment) return { count: 0, friends: [], tierBreakdown: null, costEstimate: null };

    const matchingFriends = await this.segmentsService.getMatchingFriends(
      tenantId,
      segment.tagIds,
      segment.matchType,
      segment.excludeTagIds,
    );

    // Tier breakdown + cost estimate
    const friendIds = matchingFriends.map((f: { id: string }) => f.id);
    const tierBreakdown = await this.segmentsService.getFriendTierBreakdown(friendIds);
    const COST_PER_MESSAGE = 3;
    const totalCost = matchingFriends.length * COST_PER_MESSAGE;
    const dormantCount = tierBreakdown.dormant;
    const costWithoutDormant = (matchingFriends.length - dormantCount) * COST_PER_MESSAGE;

    return {
      count: matchingFriends.length,
      friends: matchingFriends,
      tierBreakdown,
      costEstimate: {
        totalRecipients: matchingFriends.length,
        costYen: totalCost,
        dormantCount,
        costWithoutDormantYen: costWithoutDormant,
        potentialSavingsYen: totalCost - costWithoutDormant,
        pricePerMessage: COST_PER_MESSAGE,
      },
    };
  }

  @Post(':id/broadcast')
  async broadcast(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: BroadcastSegmentDto) {
    return this.segmentsService.broadcast(tenantId, id, body.message);
  }
}
