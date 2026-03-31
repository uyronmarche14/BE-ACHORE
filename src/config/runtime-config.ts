import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';

export type AppRuntimeConfig = {
  port: number;
  appUrl: string;
  frontendUrl: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessTtl: StringValue;
  jwtRefreshTtl: StringValue;
  refreshCookieName: string;
  refreshCookieSecure: boolean;
  nodeEnv: 'development' | 'test' | 'production';
};

export function getAppRuntimeConfig(
  configService: ConfigService,
): AppRuntimeConfig {
  return {
    port: configService.getOrThrow<number>('PORT'),
    appUrl: configService.getOrThrow<string>('APP_URL'),
    frontendUrl: configService.getOrThrow<string>('FRONTEND_URL'),
    jwtAccessSecret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    jwtRefreshSecret: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
    jwtAccessTtl: configService.getOrThrow<StringValue>('JWT_ACCESS_TTL'),
    jwtRefreshTtl: configService.getOrThrow<StringValue>('JWT_REFRESH_TTL'),
    refreshCookieName: configService.getOrThrow<string>('REFRESH_COOKIE_NAME'),
    nodeEnv: configService.getOrThrow<'development' | 'test' | 'production'>(
      'NODE_ENV',
    ),
    refreshCookieSecure:
      configService.get<boolean>('REFRESH_COOKIE_SECURE') ??
      configService.getOrThrow<'development' | 'test' | 'production'>(
        'NODE_ENV',
      ) === 'production',
  };
}

export function getAuthRuntimeConfig(configService: ConfigService) {
  const {
    jwtAccessSecret,
    jwtRefreshSecret,
    jwtAccessTtl,
    jwtRefreshTtl,
    refreshCookieName,
    refreshCookieSecure,
    frontendUrl,
    nodeEnv,
  } = getAppRuntimeConfig(configService);

  return {
    jwtAccessSecret,
    jwtRefreshSecret,
    jwtAccessTtl,
    jwtRefreshTtl,
    refreshCookieName,
    refreshCookieSecure,
    frontendUrl,
    nodeEnv,
  };
}
