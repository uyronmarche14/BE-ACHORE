import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';

export type AppRuntimeConfig = {
  port: number;
  appUrl: string;
  frontendUrl: string;
  swaggerEnabled: boolean;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessTtl: StringValue;
  jwtRefreshTtl: StringValue;
  refreshCookieName: string;
  refreshCookieSecure: boolean;
  trustProxyHops: number;
  nodeEnv: 'development' | 'test' | 'production';
};

export type MailRuntimeConfig = {
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean | null;
  smtpUser: string | null;
  smtpPass: string | null;
  smtpFrom: string | null;
  frontendUrl: string;
  nodeEnv: 'development' | 'test' | 'production';
};

export function getAppRuntimeConfig(
  configService: ConfigService,
): AppRuntimeConfig {
  const nodeEnv = configService.getOrThrow<
    'development' | 'test' | 'production'
  >('NODE_ENV');

  return {
    port: configService.getOrThrow<number>('PORT'),
    appUrl: configService.getOrThrow<string>('APP_URL'),
    frontendUrl: configService.getOrThrow<string>('FRONTEND_URL'),
    swaggerEnabled: configService.get<boolean>('SWAGGER_ENABLED') ?? false,
    jwtAccessSecret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    jwtRefreshSecret: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
    jwtAccessTtl: configService.getOrThrow<StringValue>('JWT_ACCESS_TTL'),
    jwtRefreshTtl: configService.getOrThrow<StringValue>('JWT_REFRESH_TTL'),
    refreshCookieName: configService.getOrThrow<string>('REFRESH_COOKIE_NAME'),
    nodeEnv,
    refreshCookieSecure:
      configService.get<boolean>('REFRESH_COOKIE_SECURE') ??
      nodeEnv === 'production',
    trustProxyHops:
      configService.get<number>('TRUST_PROXY_HOPS') ??
      (nodeEnv === 'production' ? 1 : 0),
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

export function getMailRuntimeConfig(
  configService: ConfigService,
): MailRuntimeConfig {
  const { frontendUrl, nodeEnv } = getAppRuntimeConfig(configService);

  return {
    smtpHost: configService.get<string>('SMTP_HOST') ?? null,
    smtpPort: configService.get<number>('SMTP_PORT') ?? null,
    smtpSecure: configService.get<boolean>('SMTP_SECURE') ?? null,
    smtpUser: configService.get<string>('SMTP_USER') ?? null,
    smtpPass: configService.get<string>('SMTP_PASS') ?? null,
    smtpFrom: configService.get<string>('SMTP_FROM') ?? null,
    frontendUrl,
    nodeEnv,
  };
}
