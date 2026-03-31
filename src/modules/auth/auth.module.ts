import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './controller/auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ResourceAccessGuard } from './guards/resource-access.guard';
import { AuthService } from './service/auth.service';
import { ResourceAuthorizationService } from './service/resource-authorization.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    ResourceAccessGuard,
    ResourceAuthorizationService,
  ],
  exports: [JwtAuthGuard, ResourceAccessGuard, ResourceAuthorizationService],
})
export class AuthModule {}
