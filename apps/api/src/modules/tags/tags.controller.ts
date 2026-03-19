import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { TagsService } from './tags.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('api/v1/tags')
@UseGuards(AuthGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  async list(@Req() req: any) {
    return this.tagsService.list(req.tenantId);
  }

  @Post()
  async create(@Req() req: any, @Body() body: { name: string; color?: string }) {
    return this.tagsService.create(req.tenantId, body);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: { name?: string; color?: string }) {
    await this.tagsService.update(id, body);
    return { ok: true };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.tagsService.delete(id);
    return { ok: true };
  }
}
