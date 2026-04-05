import { ConfigService } from '@nestjs/config';
import {
  environmentValidationSchema,
  getEnvironmentFilePaths,
} from './environment';
import { getAppRuntimeConfig, getAuthRuntimeConfig } from './runtime-config';

describe('environment configuration', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('requires JWT secrets to be defined', () => {
    const result = environmentValidationSchema.validate(
      {
        PORT: 4000,
        APP_URL: 'http://localhost:4000',
        FRONTEND_URL: 'http://localhost:3000',
        DATABASE_URL: 'mysql://dowinn:dowinn@127.0.0.1:3308/dowinn',
        NODE_ENV: 'development',
      },
      {
        abortEarly: false,
      },
    );

    expect(
      result.error?.details.map((detail) => detail.path.join('.')),
    ).toEqual(
      expect.arrayContaining(['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']),
    );
  });

  it('defaults seed access to disabled', () => {
    const result = environmentValidationSchema.validate({
      PORT: 4000,
      APP_URL: 'http://localhost:4000',
      FRONTEND_URL: 'http://localhost:3000',
      DATABASE_URL: 'mysql://dowinn:dowinn@127.0.0.1:3308/dowinn',
      JWT_ACCESS_SECRET: 'development-access-secret-123',
      JWT_REFRESH_SECRET: 'development-refresh-secret-123',
      NODE_ENV: 'development',
    });

    expect((result.value as { SEED_ENABLED: boolean }).SEED_ENABLED).toBe(
      false,
    );
  });

  it('defaults Swagger access to disabled', () => {
    const result = environmentValidationSchema.validate({
      PORT: 4000,
      APP_URL: 'http://localhost:4000',
      FRONTEND_URL: 'http://localhost:3000',
      DATABASE_URL: 'mysql://dowinn:dowinn@127.0.0.1:3308/dowinn',
      JWT_ACCESS_SECRET: 'development-access-secret-123',
      JWT_REFRESH_SECRET: 'development-refresh-secret-123',
      NODE_ENV: 'development',
    });

    expect((result.value as { SWAGGER_ENABLED: boolean }).SWAGGER_ENABLED).toBe(
      false,
    );
  });

  it('loads APP_ENV-specific files before NODE_ENV fallbacks', () => {
    process.env = {
      ...originalEnv,
      APP_ENV: 'staging',
      NODE_ENV: 'production',
    };

    expect(getEnvironmentFilePaths()).toEqual([
      '.env.staging.local',
      '.env.staging',
      '.env.production.local',
      '.env.production',
      '.env.local',
      '.env',
    ]);
  });

  it('treats APP_ENV=local as the plain .env.local file', () => {
    process.env = {
      ...originalEnv,
      APP_ENV: 'local',
      NODE_ENV: 'development',
    };

    expect(getEnvironmentFilePaths()).toEqual([
      '.env.local',
      '.env.development.local',
      '.env.development',
      '.env',
    ]);
  });

  it('defaults secure refresh cookies on production when the override is absent', () => {
    const configService = {
      getOrThrow: jest.fn((key: string) => {
        const config: Record<string, string | number> = {
          PORT: 4000,
          APP_URL: 'https://api.archon.example.com',
          FRONTEND_URL: 'https://archon.example.com',
          JWT_ACCESS_SECRET: 'production-access-secret-123',
          JWT_REFRESH_SECRET: 'production-refresh-secret-123',
          JWT_ACCESS_TTL: '15m',
          JWT_REFRESH_TTL: '7d',
          REFRESH_COOKIE_NAME: 'archon_refresh_token',
          NODE_ENV: 'production',
        };

        return config[key];
      }),
      get: jest.fn((key: string) => {
        if (key === 'REFRESH_COOKIE_SECURE') {
          return undefined;
        }

        return undefined;
      }),
    } as unknown as ConfigService;

    expect(getAuthRuntimeConfig(configService).refreshCookieSecure).toBe(true);
  });

  it('defaults secure refresh cookies to false outside production when the override is absent', () => {
    const configService = {
      getOrThrow: jest.fn((key: string) => {
        const config: Record<string, string | number> = {
          PORT: 4000,
          APP_URL: 'http://localhost:4000',
          FRONTEND_URL: 'http://localhost:3000',
          JWT_ACCESS_SECRET: 'development-access-secret-123',
          JWT_REFRESH_SECRET: 'development-refresh-secret-123',
          JWT_ACCESS_TTL: '15m',
          JWT_REFRESH_TTL: '7d',
          REFRESH_COOKIE_NAME: 'archon_refresh_token',
          NODE_ENV: 'development',
        };

        return config[key];
      }),
      get: jest.fn((key: string) => {
        if (key === 'REFRESH_COOKIE_SECURE') {
          return undefined;
        }

        return undefined;
      }),
    } as unknown as ConfigService;

    expect(getAuthRuntimeConfig(configService).refreshCookieSecure).toBe(false);
  });

  it('defaults trust proxy hops to 1 in production when the override is absent', () => {
    const configService = {
      getOrThrow: jest.fn((key: string) => {
        const config: Record<string, string | number> = {
          PORT: 4000,
          APP_URL: 'https://api.archon.example.com',
          FRONTEND_URL: 'https://archon.example.com',
          JWT_ACCESS_SECRET: 'production-access-secret-123',
          JWT_REFRESH_SECRET: 'production-refresh-secret-123',
          JWT_ACCESS_TTL: '15m',
          JWT_REFRESH_TTL: '7d',
          REFRESH_COOKIE_NAME: 'archon_refresh_token',
          NODE_ENV: 'production',
        };

        return config[key];
      }),
      get: jest.fn((key: string) => {
        if (key === 'REFRESH_COOKIE_SECURE' || key === 'TRUST_PROXY_HOPS') {
          return undefined;
        }

        return undefined;
      }),
    } as unknown as ConfigService;

    expect(getAppRuntimeConfig(configService).trustProxyHops).toBe(1);
  });

  it('defaults trust proxy hops to 0 outside production when the override is absent', () => {
    const configService = {
      getOrThrow: jest.fn((key: string) => {
        const config: Record<string, string | number> = {
          PORT: 4000,
          APP_URL: 'http://localhost:4000',
          FRONTEND_URL: 'http://localhost:3000',
          JWT_ACCESS_SECRET: 'development-access-secret-123',
          JWT_REFRESH_SECRET: 'development-refresh-secret-123',
          JWT_ACCESS_TTL: '15m',
          JWT_REFRESH_TTL: '7d',
          REFRESH_COOKIE_NAME: 'archon_refresh_token',
          NODE_ENV: 'development',
        };

        return config[key];
      }),
      get: jest.fn((key: string) => {
        if (key === 'REFRESH_COOKIE_SECURE' || key === 'TRUST_PROXY_HOPS') {
          return undefined;
        }

        return undefined;
      }),
    } as unknown as ConfigService;

    expect(getAppRuntimeConfig(configService).trustProxyHops).toBe(0);
  });
});
