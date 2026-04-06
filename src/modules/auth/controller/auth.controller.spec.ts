/* eslint-disable @typescript-eslint/unbound-method */

import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthOriginGuard } from '../guards/auth-origin.guard';
import { AuthRateLimitGuard } from '../guards/auth-rate-limit.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthRateLimitService } from '../service/auth-rate-limit.service';
import { AuthService } from '../service/auth.service';
import type { AuthenticatedRequest } from '../types/authenticated-request.type';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        Reflector,
        AuthOriginGuard,
        AuthRateLimitGuard,
        AuthRateLimitService,
        {
          provide: AuthService,
          useValue: {
            signup: jest.fn().mockResolvedValue({
              message: 'Check your email to verify your account',
              email: 'jane@example.com',
              emailVerificationRequired: true,
            }),
            login: jest.fn().mockResolvedValue({
              user: {
                id: 'user-1',
                name: 'Jane Doe',
                email: 'jane@example.com',
                role: 'MEMBER',
                emailVerifiedAt: '2026-04-01T00:00:00.000Z',
              },
              accessToken: 'next-access-token',
              refreshToken: 'next-refresh-token',
              refreshTokenExpiresAt: new Date('2026-04-09T00:00:00.000Z'),
            }),
            refresh: jest.fn().mockResolvedValue({
              accessToken: 'rotated-access-token',
              refreshToken: 'rotated-refresh-token',
              refreshTokenExpiresAt: new Date('2026-04-10T00:00:00.000Z'),
            }),
            logout: jest.fn().mockResolvedValue({
              loggedOut: true,
            }),
            authenticateAccessToken: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const config: Record<string, string | boolean> = {
                JWT_ACCESS_SECRET: 'test-access-secret-12345',
                JWT_REFRESH_SECRET: 'test-refresh-secret-12345',
                JWT_ACCESS_TTL: '15m',
                JWT_REFRESH_TTL: '7d',
                REFRESH_COOKIE_NAME: 'archon_refresh_token',
                REFRESH_COOKIE_SECURE: false,
                FRONTEND_URL: 'http://localhost:3000',
                NODE_ENV: 'test',
                APP_URL: 'http://localhost:4001',
                PORT: '4001',
              };

              return config[key];
            }),
            get: jest.fn((key: string) => {
              if (key === 'REFRESH_COOKIE_SECURE') {
                return false;
              }

              return undefined;
            }),
          },
        },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('returns the signup response and sets the refresh token cookie', async () => {
    const response = createResponse();

    const result = await authController.signup(
      {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'StrongPass1',
      },
      response,
    );

    expect(result).toEqual({
      message: 'Check your email to verify your account',
      email: 'jane@example.com',
      emailVerificationRequired: true,
    });
    expect(response.clearCookie).toHaveBeenCalledWith(
      'archon_refresh_token',
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
      }),
    );
  });

  it('preserves a bypassed signup response without forcing verification to true', async () => {
    authService.signup.mockResolvedValueOnce({
      message: 'Account created successfully. You can log in now.',
      email: 'jane@example.com',
      emailVerificationRequired: false,
    });
    const response = createResponse();

    const result = await authController.signup(
      {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'StrongPass1',
      },
      response,
    );

    expect(result).toEqual({
      message: 'Account created successfully. You can log in now.',
      email: 'jane@example.com',
      emailVerificationRequired: false,
    });
  });

  it('returns the login response and sets the refresh token cookie', async () => {
    const response = createResponse();

    const result = await authController.login(
      {
        email: 'jane@example.com',
        password: 'StrongPass1',
      },
      response,
    );

    expect(result).toEqual({
      user: {
        id: 'user-1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'MEMBER',
        emailVerifiedAt: '2026-04-01T00:00:00.000Z',
      },
      accessToken: 'next-access-token',
    });
    expect(response.cookie).toHaveBeenCalledWith(
      'archon_refresh_token',
      'next-refresh-token',
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
      }),
    );
  });

  it('reads the refresh cookie and rotates the session cookie', async () => {
    const request = {
      headers: {
        cookie: 'archon_refresh_token=existing-refresh-token',
      },
    } as Request;
    const response = createResponse();

    const result = await authController.refresh(request, response);

    expect(authService.refresh).toHaveBeenCalledWith('existing-refresh-token');
    expect(result).toEqual({
      accessToken: 'rotated-access-token',
    });
    expect(response.cookie).toHaveBeenCalledWith(
      'archon_refresh_token',
      'rotated-refresh-token',
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
      }),
    );
  });

  it('supports refresh-token recovery after an expired access token is rejected', async () => {
    const jwtAuthGuard = new JwtAuthGuard(authService);
    const protectedRequest = {
      headers: {
        authorization: 'Bearer expired-access-token',
      },
    } as AuthenticatedRequest;
    const refreshRequest = {
      headers: {
        authorization: 'Bearer expired-access-token',
        cookie: 'archon_refresh_token=existing-refresh-token',
      },
    } as Request;
    const response = createResponse();

    authService.authenticateAccessToken.mockRejectedValue(
      new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Authentication is required',
        details: null,
      }),
    );

    await expect(
      jwtAuthGuard.canActivate(createExecutionContext(protectedRequest)),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const result = await authController.refresh(refreshRequest, response);

    expect(authService.refresh).toHaveBeenCalledWith('existing-refresh-token');
    expect(result).toEqual({
      accessToken: 'rotated-access-token',
    });
    expect(response.cookie).toHaveBeenCalledWith(
      'archon_refresh_token',
      'rotated-refresh-token',
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
      }),
    );
  });

  it('clears the refresh cookie on logout', async () => {
    const request = {
      headers: {
        cookie: 'archon_refresh_token=existing-refresh-token',
      },
    } as Request;
    const response = createResponse();

    const result = await authController.logout(request, response);

    expect(authService.logout).toHaveBeenCalledWith('existing-refresh-token');
    expect(response.clearCookie).toHaveBeenCalledWith(
      'archon_refresh_token',
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
      }),
    );
    expect(result).toEqual({
      loggedOut: true,
    });
  });

  it('returns the current user from the guard-populated auth context', () => {
    const result = authController.getCurrentUser({
      id: 'user-1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'MEMBER',
      emailVerifiedAt: '2026-04-01T00:00:00.000Z',
    });

    expect(result).toEqual({
      user: {
        id: 'user-1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'MEMBER',
        emailVerifiedAt: '2026-04-01T00:00:00.000Z',
      },
    });
  });
});

function createResponse() {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response & {
    cookie: jest.Mock;
    clearCookie: jest.Mock;
  };
}

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
