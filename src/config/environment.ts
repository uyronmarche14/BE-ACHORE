import Joi from 'joi';

export const environmentValidationSchema = Joi.object({
  PORT: Joi.number().port().default(4000),
  APP_URL: Joi.string().uri().default('http://localhost:4000'),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['mysql'] })
    .default('mysql://dowinn:dowinn@127.0.0.1:3308/dowinn'),
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  JWT_REFRESH_TTL: Joi.string().default('7d'),
  REFRESH_COOKIE_NAME: Joi.string().default('archon_refresh_token'),
  REFRESH_COOKIE_SECURE: Joi.boolean().optional(),
  SEED_ENABLED: Joi.boolean().default(false),
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
});

export function getEnvironmentFilePaths() {
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  return [`.env.${nodeEnv}.local`, `.env.${nodeEnv}`, '.env.local', '.env'];
}
