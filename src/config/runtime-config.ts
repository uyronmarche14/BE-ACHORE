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
  emailVerificationMode: EmailVerificationMode;
  inviteDeliveryMode: InviteDeliveryMode;
  nodeEnv: 'development' | 'test' | 'production';
};

export type MailProvider = 'smtp' | 'resend';
export type EmailVerificationMode = 'required' | 'bypass';
export type InviteDeliveryMode = 'email' | 'link';

export type MailRuntimeConfig = {
  mailProvider: MailProvider;
  mailFrom: string | null;
  resendApiKey: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean | null;
  smtpUser: string | null;
  smtpPass: string | null;
  smtpFrom: string | null;
  smtpConnectionTimeoutMs: number;
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
    emailVerificationMode:
      configService.get<EmailVerificationMode>('EMAIL_VERIFICATION_MODE') ??
      'bypass',
    inviteDeliveryMode:
      configService.get<InviteDeliveryMode>('INVITE_DELIVERY_MODE') ?? 'link',
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
    emailVerificationMode,
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
    emailVerificationMode,
    frontendUrl,
    nodeEnv,
  };
}

export function getMailRuntimeConfig(
  configService: ConfigService,
): MailRuntimeConfig {
  const { frontendUrl, nodeEnv } = getAppRuntimeConfig(configService);
  const mailFrom =
    configService.get<string>('MAIL_FROM') ??
    configService.get<string>('SMTP_FROM') ??
    null;

  return {
    mailProvider: configService.get<MailProvider>('MAIL_PROVIDER') ?? 'smtp',
    mailFrom,
    resendApiKey: configService.get<string>('RESEND_API_KEY') ?? null,
    smtpHost: configService.get<string>('SMTP_HOST') ?? null,
    smtpPort: configService.get<number>('SMTP_PORT') ?? null,
    smtpSecure: configService.get<boolean>('SMTP_SECURE') ?? null,
    smtpUser: configService.get<string>('SMTP_USER') ?? null,
    smtpPass: configService.get<string>('SMTP_PASS') ?? null,
    smtpFrom: configService.get<string>('SMTP_FROM') ?? null,
    smtpConnectionTimeoutMs:
      configService.get<number>('SMTP_CONNECTION_TIMEOUT_MS') ?? 10_000,
    frontendUrl,
    nodeEnv,
  };
}
