import { IsString } from 'class-validator';

export class SubscribeDto {
  @IsString()
  planId: string;
}

export class CheckoutDto {
  @IsString()
  planId: string;
}
