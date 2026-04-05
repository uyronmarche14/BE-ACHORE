import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createRateLimitedException } from '../../../common/utils/api-exception.util';
import type { Request } from 'express';
import { AUTH_RATE_LIMIT_METADATA } from '../constants/auth-metadata.constant';
import { AuthRateLimitService } from '../service/auth-rate-limit.service';
import type { AuthRateLimitMetadata } from '../types/auth-rate-limit.type';

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authRateLimitService: AuthRateLimitService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const metadata = this.reflector.getAllAndOverride<AuthRateLimitMetadata>(
      AUTH_RATE_LIMIT_METADATA,
      [context.getHandler(), context.getClass()],
    );

    if (!metadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const clientId = getClientIdentifier(request);
    const allowed = this.authRateLimitService.consume(metadata, clientId);

    if (!allowed) {
      throw createRateLimitedException({
        message: 'Too many auth attempts. Please try again later.',
      });
    }

    return true;
  }
}

function getClientIdentifier(request: Request) {
  if (request.ip) {
    return request.ip;
  }

  return request.socket.remoteAddress ?? 'unknown-client';
}
