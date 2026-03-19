import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { FormsService } from './forms.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('api/v1/forms')
@UseGuards(AuthGuard)
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Get()
  async list(@Req() req: any) {
    return this.formsService.list(req.tenantId);
  }

  @Post()
  async create(@Req() req: any, @Body() body: { name: string; description?: string; fields: any[]; thankYouMessage?: string }) {
    return this.formsService.create(req.tenantId, body);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.formsService.getById(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    await this.formsService.update(id, body);
    return { ok: true };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.formsService.delete(id);
    return { ok: true };
  }

  @Post(':id/submit')
  async submit(@Param('id') formId: string, @Body() body: { friendId?: string; answers: any }) {
    return this.formsService.submitResponse(formId, body.friendId || null, body.answers);
  }

  @Get(':id/responses')
  async responses(@Param('id') formId: string) {
    return this.formsService.getResponses(formId);
  }
}
