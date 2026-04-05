import type { ExecutionContext } from '@nestjs/common';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import type { AuthRateLimitMetadata } from '../types/auth-rate-limit.type';

describe('AuthRateLimitGuard', () => {
  const metadata: AuthRateLimitMetadata = {
    key: 'login',
    limit: 5,
    windowMs: 60_000,
  };

  it('uses request.ip instead of raw forwarded headers when available', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(metadata),
    };
    const authRateLimitService = {
      consume: jest.fn().mockReturnValue(true),
    };
    const guard = new AuthRateLimitGuard(
      reflector as never,
      authRateLimitService as never,
    );

    expect(
      guard.canActivate(
        createExecutionContext({
          headers: {
            'x-forwarded-for': '203.0.113.10',
          },
          ip: '198.51.100.20',
          socket: {
            remoteAddress: '198.51.100.30',
          },
        }),
      ),
    ).toBe(true);
    expect(authRateLimitService.consume).toHaveBeenCalledWith(
      metadata,
      '198.51.100.20',
    );
  });

  it('falls back to the socket address when request.ip is missing', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(metadata),
    };
    const authRateLimitService = {
      consume: jest.fn().mockReturnValue(true),
    };
    const guard = new AuthRateLimitGuard(
      reflector as never,
      authRateLimitService as never,
    );

    expect(
      guard.canActivate(
        createExecutionContext({
          headers: {
            'x-forwarded-for': '203.0.113.10',
          },
          socket: {
            remoteAddress: '198.51.100.30',
          },
        }),
      ),
    ).toBe(true);
    expect(authRateLimitService.consume).toHaveBeenCalledWith(
      metadata,
      '198.51.100.30',
    );
  });
});

function createExecutionContext(request: {
  headers: Record<string, string>;
  ip?: string;
  socket: {
    remoteAddress?: string;
  };
}) {
  return {
    getClass: () => undefined,
    getHandler: () => undefined,
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}
