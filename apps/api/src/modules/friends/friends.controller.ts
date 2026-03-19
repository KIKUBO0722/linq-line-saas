import { Controller, Get, Param, Query } from '@nestjs/common';
import { FriendsService } from './friends.service';

// TODO: Add AuthGuard once auth module is built
@Controller('api/v1/friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  async list(
    @Query('tenantId') tenantId: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.friendsService.findByTenant(tenantId, {
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.friendsService.findById(id);
  }
}
