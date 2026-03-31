import Joi from 'joi';

export const environmentValidationSchema = Joi.object({
  PORT: Joi.number().port().default(4000),
  APP_URL: Joi.string().uri().default('http://localhost:4000'),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['mysql'] })
    .default('mysql://dowinn:dowinn@localhost:3306/dowinn'),
  JWT_ACCESS_SECRET: Joi.string().min(16).default('change-me-access-secret'),
  JWT_REFRESH_SECRET: Joi.string().min(16).default('change-me-refresh-secret'),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  JWT_REFRESH_TTL: Joi.string().default('7d'),
  REFRESH_COOKIE_NAME: Joi.string().default('archon_refresh_token'),
  REFRESH_COOKIE_SECURE: Joi.boolean().default(false),
  SEED_ENABLED: Joi.boolean().default(true),
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
});

export function getEnvironmentFilePaths() {
  return ['.env.local', '.env'];
}
