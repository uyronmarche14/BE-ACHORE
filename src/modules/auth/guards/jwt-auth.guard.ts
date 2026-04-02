import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { createUnauthenticatedException } from '../../../common/utils/api-exception.util';
import { AuthService } from '../service/auth.service';
import { extractBearerToken } from '../utils/auth-request.util';
import type { AuthenticatedRequest } from '../types/authenticated-request.type';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const accessToken = extractBearerToken(request.headers.authorization);

    if (!accessToken) {
      throw this.createUnauthenticatedException();
    }

    request.user = await this.authService.authenticateAccessToken(accessToken);

    return true;
  }

  private createUnauthenticatedException() {
    return createUnauthenticatedException({
      message: 'Authentication is required',
    });
  }
}
