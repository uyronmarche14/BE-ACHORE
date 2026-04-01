import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './controller/auth.controller';
import { AuthRateLimitGuard } from './guards/auth-rate-limit.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ResourceAccessGuard } from './guards/resource-access.guard';
import { AuthRateLimitService } from './service/auth-rate-limit.service';
import { AuthService } from './service/auth.service';
import { ResourceAuthorizationService } from './service/resource-authorization.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    Reflector,
    AuthService,
    AuthRateLimitGuard,
    AuthRateLimitService,
    JwtAuthGuard,
    ResourceAccessGuard,
    ResourceAuthorizationService,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    ResourceAccessGuard,
    ResourceAuthorizationService,
  ],
})
export class AuthModule {}
