import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import { getAuthRuntimeConfig } from '../../../config/runtime-config';

export function getRefreshCookieName(configService: ConfigService) {
  return getAuthRuntimeConfig(configService).refreshCookieName;
}

export function setRefreshTokenCookie(
  response: Response,
  configService: ConfigService,
  refreshToken: string,
  refreshTokenExpiresAt: Date,
) {
  response.cookie(
    getRefreshCookieName(configService),
    refreshToken,
    buildRefreshCookieOptions(configService, refreshTokenExpiresAt),
  );
}

export function clearRefreshTokenCookie(
  response: Response,
  configService: ConfigService,
) {
  response.clearCookie(
    getRefreshCookieName(configService),
    buildBaseRefreshCookieOptions(configService),
  );
}

function buildRefreshCookieOptions(
  configService: ConfigService,
  refreshTokenExpiresAt: Date,
): CookieOptions {
  return {
    ...buildBaseRefreshCookieOptions(configService),
    expires: refreshTokenExpiresAt,
  };
}

function buildBaseRefreshCookieOptions(
  configService: ConfigService,
): CookieOptions {
  const authConfig = getAuthRuntimeConfig(configService);

  return {
    httpOnly: true,
    secure: authConfig.refreshCookieSecure,
    sameSite: 'lax',
    path: '/',
  };
}
