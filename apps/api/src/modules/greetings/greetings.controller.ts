import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GreetingsService } from './greetings.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CreateGreetingDto, UpdateGreetingDto } from './dto/greetings.dto';

@ApiTags('Greetings')
@Controller('api/v1/greetings')
@UseGuards(AuthGuard)
export class GreetingsController {
  constructor(private readonly greetingsService: GreetingsService) {}

  @Get()
  async list(@TenantId() tenantId: string) {
    return this.greetingsService.list(tenantId);
  }

  @Post()
  async create(@TenantId() tenantId: string, @Body() body: CreateGreetingDto) {
    return this.greetingsService.create(tenantId, body);
  }

  @Patch(':id')
  async update(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: UpdateGreetingDto) {
    return this.greetingsService.update(id, tenantId, body);
  }

  @Delete(':id')
  async delete(@TenantId() tenantId: string, @Param('id') id: string) {
    await this.greetingsService.delete(id, tenantId);
    return { success: true };
  }
}
