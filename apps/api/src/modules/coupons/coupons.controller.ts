import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CreateCouponDto, UpdateCouponDto, ToggleCouponDto } from './dto/coupons.dto';

@Controller('api/v1/coupons')
@UseGuards(AuthGuard)
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  async list(@TenantId() tenantId: string) {
    return this.couponsService.list(tenantId);
  }

  @Post()
  async create(@TenantId() tenantId: string, @Body() body: CreateCouponDto) {
    return this.couponsService.create(tenantId, body);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateCouponDto) {
    return this.couponsService.update(id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.couponsService.delete(id);
    return { ok: true };
  }

  @Post(':id/toggle')
  async toggle(@Param('id') id: string, @Body() body: ToggleCouponDto) {
    return this.couponsService.toggle(id, body.isActive);
  }
}
