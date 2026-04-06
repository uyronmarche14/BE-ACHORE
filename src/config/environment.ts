import Joi from 'joi';

type MailProviderValidationShape = {
  MAIL_PROVIDER?: 'smtp' | 'resend';
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  SMTP_FROM?: string;
};

export const environmentValidationSchema = Joi.object({
  APP_ENV: Joi.string()
    .valid('local', 'development', 'test', 'staging', 'prod', 'production')
    .optional(),
  PORT: Joi.number().port().default(4000),
  APP_URL: Joi.string().uri().default('http://localhost:4000'),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),
  SWAGGER_ENABLED: Joi.boolean().default(false),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['mysql'] })
    .default('mysql://dowinn:dowinn@127.0.0.1:3308/dowinn'),
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  JWT_REFRESH_TTL: Joi.string().default('7d'),
  REFRESH_COOKIE_NAME: Joi.string().default('archon_refresh_token'),
  REFRESH_COOKIE_SECURE: Joi.boolean().optional(),
  TRUST_PROXY_HOPS: Joi.number().integer().min(0).optional(),
  EMAIL_VERIFICATION_MODE: Joi.string()
    .valid('required', 'bypass')
    .default('bypass'),
  INVITE_DELIVERY_MODE: Joi.string().valid('email', 'link').default('link'),
  MAIL_PROVIDER: Joi.string().valid('smtp', 'resend').default('smtp'),
  MAIL_FROM: Joi.string().trim().min(3).optional(),
  RESEND_API_KEY: Joi.string().trim().optional(),
  SMTP_HOST: Joi.string().hostname().optional(),
  SMTP_PORT: Joi.number().port().optional(),
  SMTP_SECURE: Joi.boolean().optional(),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASS: Joi.string().optional(),
  SMTP_FROM: Joi.string().email().optional(),
  SMTP_CONNECTION_TIMEOUT_MS: Joi.number().integer().min(1000).optional(),
  SEED_ENABLED: Joi.boolean().default(false),
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
})
  .custom((rawValue: unknown, helpers) => {
    const value = rawValue as MailProviderValidationShape;

    if (value.MAIL_PROVIDER !== 'resend') {
      return rawValue;
    }

    if (!value.RESEND_API_KEY) {
      return helpers.error('any.custom', {
        customMessage: 'RESEND_API_KEY is required when MAIL_PROVIDER=resend',
      });
    }

    if (!value.MAIL_FROM && !value.SMTP_FROM) {
      return helpers.error('any.custom', {
        customMessage:
          'MAIL_FROM or SMTP_FROM is required when MAIL_PROVIDER=resend',
      });
    }

    return rawValue;
  }, 'mail provider configuration')
  .messages({
    'any.custom': '{{#customMessage}}',
  });

export function getEnvironmentFilePaths() {
  const appEnv = normalizeEnvironmentSelector(process.env.APP_ENV);
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  return deduplicateEnvironmentFilePaths([
    ...getAppEnvironmentFilePaths(appEnv),
    `.env.${nodeEnv}.local`,
    `.env.${nodeEnv}`,
    '.env.local',
    '.env',
  ]);
}

function getAppEnvironmentFilePaths(appEnv?: string) {
  if (!appEnv) {
    return [];
  }

  if (appEnv === 'local') {
    return ['.env.local'];
  }

  return [`.env.${appEnv}.local`, `.env.${appEnv}`];
}

function normalizeEnvironmentSelector(value?: string) {
  if (!value) {
    return undefined;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : undefined;
}

function deduplicateEnvironmentFilePaths(filePaths: string[]) {
  return [...new Set(filePaths)];
}
