import { AuthRateLimitService } from './auth-rate-limit.service';

describe('AuthRateLimitService', () => {
  const rateLimitMetadata = {
    key: 'signup',
    limit: 2,
    windowMs: 60_000,
  };

  let authRateLimitService: AuthRateLimitService;

  beforeEach(() => {
    authRateLimitService = new AuthRateLimitService();
  });

  it('allows requests while the client stays under the limit', () => {
    expect(
      authRateLimitService.consume(rateLimitMetadata, '203.0.113.10', 1_000),
    ).toBe(true);
    expect(
      authRateLimitService.consume(rateLimitMetadata, '203.0.113.10', 2_000),
    ).toBe(true);
  });

  it('rejects requests once the limit is exceeded', () => {
    authRateLimitService.consume(rateLimitMetadata, '203.0.113.10', 1_000);
    authRateLimitService.consume(rateLimitMetadata, '203.0.113.10', 2_000);

    expect(
      authRateLimitService.consume(rateLimitMetadata, '203.0.113.10', 3_000),
    ).toBe(false);
  });

  it('resets the bucket after the time window passes', () => {
    authRateLimitService.consume(rateLimitMetadata, '203.0.113.10', 1_000);
    authRateLimitService.consume(rateLimitMetadata, '203.0.113.10', 2_000);

    expect(
      authRateLimitService.consume(rateLimitMetadata, '203.0.113.10', 62_001),
    ).toBe(true);
  });
});
