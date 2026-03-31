/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */

import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import type { RefreshToken, User } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '../../../database/prisma.service';

jest.mock('bcrypt', () => ({
  __esModule: true,
  default: {
    hash: jest.fn(),
    compare: jest.fn(),
  },
}));

describe('AuthService', () => {
  const mockUser: User = {
    id: 'user-1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    passwordHash: 'hashed-password',
    role: 'MEMBER',
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
    updatedAt: new Date('2026-04-01T00:00:00.000Z'),
  };

  const activeRefreshToken: RefreshToken = {
    id: 'refresh-token-1',
    userId: 'user-1',
    tokenHash: 'hashed-existing-refresh-token',
    expiresAt: new Date('2026-04-08T00:00:00.000Z'),
    revokedAt: null,
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
  };

  const mockConfigService = {
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
  } as unknown as ConfigService;

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  } as unknown as jest.Mocked<JwtService>;

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  } as unknown as PrismaService & {
    user: {
      create: jest.Mock;
      findUnique: jest.Mock;
    };
    refreshToken: {
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const bcryptHash = jest.mocked(bcrypt.hash);
  const bcryptCompare = jest.mocked(bcrypt.compare);
  const jwtSignAsync = mockJwtService.signAsync as jest.Mock;
  const jwtVerifyAsync = mockJwtService.verifyAsync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    bcryptHash.mockReset();
    bcryptCompare.mockReset();
    jwtSignAsync.mockReset();
    jwtVerifyAsync.mockReset();
    mockPrismaService.user.create.mockReset();
    mockPrismaService.user.findUnique.mockReset();
    mockPrismaService.refreshToken.create.mockReset();
    mockPrismaService.refreshToken.findMany.mockReset();
    mockPrismaService.refreshToken.update.mockReset();
    mockPrismaService.$transaction.mockReset();

    mockPrismaService.user.create.mockResolvedValue(mockUser);
    mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
    mockPrismaService.refreshToken.create.mockResolvedValue(undefined);
    mockPrismaService.refreshToken.findMany.mockResolvedValue([
      activeRefreshToken,
    ]);
    mockPrismaService.refreshToken.update.mockResolvedValue(undefined);
    mockPrismaService.$transaction.mockImplementation(
      (operations: Promise<unknown>[]) => Promise.all(operations),
    );

    jwtVerifyAsync.mockResolvedValue({
      sub: 'user-1',
      email: 'jane@example.com',
      role: 'MEMBER',
    });
    bcryptCompare.mockResolvedValue(true);
  });

  it('creates a member, hashes credentials, and persists the refresh token', async () => {
    jwtSignAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    bcryptHash
      .mockResolvedValueOnce('hashed-password')
      .mockResolvedValueOnce('hashed-refresh-token');
    const authService = createAuthService();

    const result = await authService.signup({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'StrongPass1',
    });

    expect(mockPrismaService.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Jane Doe',
        email: 'jane@example.com',
        passwordHash: 'hashed-password',
        role: 'MEMBER',
        refreshTokens: {
          create: {
            tokenHash: 'hashed-refresh-token',
            expiresAt: expect.any(Date),
          },
        },
      }),
    });
    expect(result.user).toEqual({
      id: 'user-1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'MEMBER',
    });
    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
  });

  it('maps duplicate email errors to conflict exceptions', async () => {
    mockPrismaService.user.create.mockRejectedValue({ code: 'P2002' });
    const authService = createAuthService();

    await expect(
      authService.signup({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'StrongPass1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in an existing user and persists a fresh refresh token', async () => {
    bcryptCompare.mockResolvedValueOnce(true);
    bcryptHash.mockResolvedValueOnce('hashed-login-refresh-token');
    jwtSignAsync
      .mockResolvedValueOnce('login-access-token')
      .mockResolvedValueOnce('login-refresh-token');
    const authService = createAuthService();

    const result = await authService.login({
      email: 'jane@example.com',
      password: 'StrongPass1',
    });

    expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
      where: {
        email: 'jane@example.com',
      },
    });
    expect(mockPrismaService.refreshToken.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        tokenHash: 'hashed-login-refresh-token',
        expiresAt: expect.any(Date),
      },
    });
    expect(result).toEqual({
      user: {
        id: 'user-1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'MEMBER',
      },
      accessToken: 'login-access-token',
      refreshToken: 'login-refresh-token',
      refreshTokenExpiresAt: expect.any(Date),
    });
  });

  it('rejects invalid email or password during login with a generic 401', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
    bcryptCompare.mockResolvedValueOnce(false);
    const authService = createAuthService();

    await expect(
      authService.login({
        email: 'jane@example.com',
        password: 'WrongPassword1',
      }),
    ).rejects.toMatchObject({
      constructor: UnauthorizedException,
      response: {
        code: 'UNAUTHENTICATED',
        message: 'Invalid email or password',
      },
    });
  });

  it('rotates the refresh token and returns a new access token', async () => {
    jwtVerifyAsync.mockResolvedValueOnce({
      sub: 'user-1',
      email: 'jane@example.com',
      role: 'MEMBER',
    });
    bcryptCompare.mockResolvedValueOnce(true);
    jwtSignAsync
      .mockResolvedValueOnce('rotated-access-token')
      .mockResolvedValueOnce('rotated-refresh-token');
    bcryptHash.mockResolvedValueOnce('hashed-rotated-refresh-token');
    const authService = createAuthService();

    const result = await authService.refresh('existing-refresh-token');

    expect(mockPrismaService.refreshToken.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        revokedAt: null,
        expiresAt: {
          gt: expect.any(Date),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    expect(mockPrismaService.refreshToken.update).toHaveBeenCalledWith({
      where: {
        id: 'refresh-token-1',
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
    expect(mockPrismaService.refreshToken.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        tokenHash: 'hashed-rotated-refresh-token',
        expiresAt: expect.any(Date),
      },
    });
    expect(result).toEqual({
      accessToken: 'rotated-access-token',
      refreshToken: 'rotated-refresh-token',
      refreshTokenExpiresAt: expect.any(Date),
    });
  });

  it('rejects invalid refresh tokens', async () => {
    jwtVerifyAsync.mockRejectedValueOnce(new Error('invalid token'));
    const authService = createAuthService();

    await expect(authService.refresh('invalid-token')).rejects.toMatchObject({
      constructor: UnauthorizedException,
      response: {
        code: 'UNAUTHENTICATED',
        message: 'Refresh token is missing or invalid',
      },
    });
  });

  it('revokes the matching refresh token during logout', async () => {
    jwtVerifyAsync.mockResolvedValueOnce({
      sub: 'user-1',
      email: 'jane@example.com',
      role: 'MEMBER',
    });
    bcryptCompare.mockResolvedValueOnce(true);
    const authService = createAuthService();

    const result = await authService.logout('existing-refresh-token');

    expect(mockPrismaService.refreshToken.update).toHaveBeenCalledWith({
      where: {
        id: 'refresh-token-1',
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
    expect(result).toEqual({
      loggedOut: true,
    });
  });

  it('returns the current user for a valid access token', async () => {
    jwtVerifyAsync.mockResolvedValueOnce({
      sub: 'user-1',
      email: 'jane@example.com',
      role: 'MEMBER',
    });
    const authService = createAuthService();

    const result = await authService.getCurrentUser('access-token');

    expect(result).toEqual({
      user: {
        id: 'user-1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'MEMBER',
      },
    });
  });

  function createAuthService() {
    return new AuthService(
      mockPrismaService,
      mockJwtService,
      mockConfigService,
    );
  }
});
