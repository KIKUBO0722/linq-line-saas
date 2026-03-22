import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { FormsService } from './forms.service';
import { SubmitFormDto } from './dto/forms.dto';

@Controller('api/v1/public/forms')
export class PublicFormsController {
  constructor(private readonly formsService: FormsService) {}

  @Get(':id')
  async getForm(@Param('id') id: string) {
    const form = await this.formsService.getById(id);
    // Only expose safe fields to public
    return {
      id: form.id,
      name: form.name,
      description: form.description,
      fields: form.fields,
      thankYouMessage: form.thankYouMessage,
    };
  }

  @Post(':id/submit')
  async submitForm(@Param('id') formId: string, @Body() body: SubmitFormDto) {
    return this.formsService.submitResponse(formId, body.friendId || null, body.answers);
  }
}
