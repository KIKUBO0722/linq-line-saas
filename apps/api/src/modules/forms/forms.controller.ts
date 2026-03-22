import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { FormsService } from './forms.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CreateFormDto, UpdateFormDto, SubmitFormDto } from './dto/forms.dto';

@Controller('api/v1/forms')
@UseGuards(AuthGuard)
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Get()
  async list(@TenantId() tenantId: string) {
    return this.formsService.list(tenantId);
  }

  @Post()
  async create(@TenantId() tenantId: string, @Body() body: CreateFormDto) {
    return this.formsService.create(tenantId, body);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.formsService.getById(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateFormDto) {
    await this.formsService.update(id, body);
    return { ok: true };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.formsService.delete(id);
    return { ok: true };
  }

  @Post(':id/submit')
  async submit(@Param('id') formId: string, @Body() body: SubmitFormDto) {
    return this.formsService.submitResponse(formId, body.friendId || null, body.answers);
  }

  @Get(':id/responses')
  async responses(@Param('id') formId: string) {
    return this.formsService.getResponses(formId);
  }
}
