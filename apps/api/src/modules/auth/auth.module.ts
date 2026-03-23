import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { OAuthController } from './oauth.controller';
import { AuthService } from './auth.service';
import { OAuthService } from './oauth.service';

@Module({
  controllers: [AuthController, OAuthController],
  providers: [AuthService, OAuthService],
  exports: [AuthService],
})
export class AuthModule {}
