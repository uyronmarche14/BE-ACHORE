/* eslint-disable @typescript-eslint/unbound-method */

import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from '../service/auth.service';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            signup: jest.fn().mockResolvedValue({
              user: {
                id: 'user-1',
                name: 'Jane Doe',
                email: 'jane@example.com',
                role: 'MEMBER',
              },
              accessToken: 'access-token',
              refreshToken: 'refresh-token',
              refreshTokenExpiresAt: new Date('2026-04-08T00:00:00.000Z'),
            }),
            login: jest.fn().mockResolvedValue({
              user: {
                id: 'user-1',
                name: 'Jane Doe',
                email: 'jane@example.com',
                role: 'MEMBER',
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
            getCurrentUser: jest.fn().mockResolvedValue({
              user: {
                id: 'user-1',
                name: 'Jane Doe',
                email: 'jane@example.com',
                role: 'MEMBER',
              },
            }),
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
      user: {
        id: 'user-1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'MEMBER',
      },
      accessToken: 'access-token',
    });
    expect(response.cookie).toHaveBeenCalledWith(
      'archon_refresh_token',
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
      }),
    );
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

  it('returns the current user for a bearer token', async () => {
    const result = await authController.getCurrentUser(
      'Bearer access-token-value',
    );

    expect(authService.getCurrentUser).toHaveBeenCalledWith(
      'access-token-value',
    );
    expect(result).toEqual({
      user: {
        id: 'user-1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'MEMBER',
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
