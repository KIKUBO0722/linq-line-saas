import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { OnboardingService } from './onboarding.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';

class ApplyTemplateDto {
  @IsString()
  industryId: string;
}

@ApiTags('Onboarding')
@Controller('api/v1/onboarding')
@UseGuards(AuthGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('templates')
  getTemplates() {
    return this.onboardingService.getTemplates();
  }

  @Post('apply-template')
  async applyTemplate(
    @TenantId() tenantId: string,
    @Body() body: ApplyTemplateDto,
  ) {
    return this.onboardingService.applyTemplate(tenantId, body.industryId);
  }
}
