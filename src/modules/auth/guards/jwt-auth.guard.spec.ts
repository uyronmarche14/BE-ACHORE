/* eslint-disable @typescript-eslint/unbound-method */

import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthService } from '../service/auth.service';
import type { AuthenticatedRequest } from '../types/authenticated-request.type';

describe('JwtAuthGuard', () => {
  const mockAuthService = {
    authenticateAccessToken: jest.fn(),
  } as unknown as jest.Mocked<AuthService>;

  const jwtAuthGuard = new JwtAuthGuard(mockAuthService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects requests without a bearer token', async () => {
    const request = {
      headers: {},
    } as AuthenticatedRequest;

    await expect(
      jwtAuthGuard.canActivate(createExecutionContext(request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('attaches the authenticated user for a valid bearer token', async () => {
    const request = {
      headers: {
        authorization: 'Bearer valid-access-token',
      },
    } as AuthenticatedRequest;

    mockAuthService.authenticateAccessToken.mockResolvedValue({
      id: 'user-1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'MEMBER',
      emailVerifiedAt: '2026-04-01T00:00:00.000Z',
    });

    await expect(
      jwtAuthGuard.canActivate(createExecutionContext(request)),
    ).resolves.toBe(true);
    expect(mockAuthService.authenticateAccessToken).toHaveBeenCalledWith(
      'valid-access-token',
    );
    expect(request.user).toEqual({
      id: 'user-1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'MEMBER',
      emailVerifiedAt: '2026-04-01T00:00:00.000Z',
    });
  });

  it('propagates invalid or expired access token failures', async () => {
    const request = {
      headers: {
        authorization: 'Bearer expired-access-token',
      },
    } as AuthenticatedRequest;

    mockAuthService.authenticateAccessToken.mockRejectedValue(
      new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Authentication is required',
        details: null,
      }),
    );

    await expect(
      jwtAuthGuard.canActivate(createExecutionContext(request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

function createExecutionContext(
  request: AuthenticatedRequest,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => undefined,
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext;
}
