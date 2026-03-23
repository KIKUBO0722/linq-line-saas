import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CreateTagDto, UpdateTagDto } from './dto/tags.dto';

@ApiTags('Tags')
@Controller('api/v1/tags')
@UseGuards(AuthGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  async list(@TenantId() tenantId: string) {
    return this.tagsService.list(tenantId);
  }

  @Post()
  async create(@TenantId() tenantId: string, @Body() body: CreateTagDto) {
    return this.tagsService.create(tenantId, body);
  }

  @Patch(':id')
  async update(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: UpdateTagDto) {
    await this.tagsService.update(id, body, tenantId);
    return { ok: true };
  }

  @Delete(':id')
  async delete(@TenantId() tenantId: string, @Param('id') id: string) {
    await this.tagsService.delete(id, tenantId);
    return { ok: true };
  }
}
