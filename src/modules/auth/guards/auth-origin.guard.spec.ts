import type { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthOriginGuard } from './auth-origin.guard';

describe('AuthOriginGuard', () => {
  it('allows matching origin headers', () => {
    const guard = new AuthOriginGuard(
      createConfigService({
        APP_URL: 'https://api.archon.example.com',
        FRONTEND_URL: 'https://archon.example.com',
        NODE_ENV: 'production',
      }),
    );

    expect(
      guard.canActivate(
        createExecutionContext({
          headers: {
            origin: 'https://archon.example.com',
          },
        }),
      ),
    ).toBe(true);
  });

  it('falls back to a matching referer when origin is missing', () => {
    const guard = new AuthOriginGuard(
      createConfigService({
        APP_URL: 'https://api.archon.example.com',
        FRONTEND_URL: 'https://archon.example.com',
        NODE_ENV: 'production',
      }),
    );

    expect(
      guard.canActivate(
        createExecutionContext({
          headers: {
            referer: 'https://archon.example.com/app/projects/launch',
          },
        }),
      ),
    ).toBe(true);
  });

  it('rejects mismatched origins in production', () => {
    const guard = new AuthOriginGuard(
      createConfigService({
        APP_URL: 'https://api.archon.example.com',
        FRONTEND_URL: 'https://archon.example.com',
        NODE_ENV: 'production',
      }),
    );

    expect(() =>
      guard.canActivate(
        createExecutionContext({
          headers: {
            origin: 'https://evil.example.com',
          },
        }),
      ),
    ).toThrow('Cross-site auth requests are not allowed.');
  });

  it('rejects missing origin headers in production', () => {
    const guard = new AuthOriginGuard(
      createConfigService({
        APP_URL: 'https://api.archon.example.com',
        FRONTEND_URL: 'https://archon.example.com',
        NODE_ENV: 'production',
      }),
    );

    expect(() =>
      guard.canActivate(
        createExecutionContext({
          headers: {},
        }),
      ),
    ).toThrow('Cross-site auth requests are not allowed.');
  });

  it('allows missing origin headers outside production', () => {
    const guard = new AuthOriginGuard(
      createConfigService({
        APP_URL: 'http://localhost:4000',
        FRONTEND_URL: 'http://localhost:3000',
        NODE_ENV: 'test',
      }),
    );

    expect(
      guard.canActivate(
        createExecutionContext({
          headers: {},
        }),
      ),
    ).toBe(true);
  });
});

function createExecutionContext(request: { headers: Record<string, string> }) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

function createConfigService(config: Record<string, string>): ConfigService {
  return {
    getOrThrow: jest.fn((key: string) => config[key]),
    get: jest.fn(() => undefined),
  } as unknown as ConfigService;
}
