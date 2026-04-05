import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { createForbiddenException } from '../../../common/utils/api-exception.util';

@Injectable()
export class AuthOriginGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const appUrl = this.configService.getOrThrow<string>('APP_URL');
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
    const nodeEnv = this.configService.getOrThrow<
      'development' | 'test' | 'production'
    >('NODE_ENV');
    const requestOrigin = extractRequestOrigin(request);

    if (!requestOrigin) {
      if (nodeEnv !== 'production') {
        return true;
      }

      throw createForbiddenException({
        message: 'Cross-site auth requests are not allowed.',
      });
    }

    const allowedOrigins = new Set(
      [appUrl, frontendUrl].map(normalizeOrigin).filter(Boolean),
    );

    if (allowedOrigins.has(requestOrigin)) {
      return true;
    }

    throw createForbiddenException({
      message: 'Cross-site auth requests are not allowed.',
    });
  }
}

function extractRequestOrigin(request: Request) {
  return (
    normalizeOrigin(request.headers.origin) ??
    normalizeOrigin(request.headers.referer) ??
    null
  );
}

function normalizeOrigin(headerValue: string | string[] | undefined) {
  const value = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}
