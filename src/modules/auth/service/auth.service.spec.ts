/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */

import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { RefreshToken, User } from '@prisma/client';
import bcrypt from 'bcrypt';
import { PrismaService } from '../../../database/prisma.service';
import { MailService } from '../../mail/service/mail.service';
import { AuthService } from './auth.service';

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
    emailVerifiedAt: new Date('2026-04-01T00:00:00.000Z'),
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
    updatedAt: new Date('2026-04-01T00:00:00.000Z'),
  };

  const unverifiedUser: User = {
    ...mockUser,
    emailVerifiedAt: null,
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
    get: jest.fn((key: string) => {
      if (key === 'REFRESH_COOKIE_SECURE') {
        return false;
      }

      return undefined;
    }),
  } as unknown as ConfigService;

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  } as unknown as jest.Mocked<JwtService>;

  const mockMailService = {
    sendMail: jest.fn(),
  } as unknown as jest.Mocked<MailService>;

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    emailVerificationToken: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService & {
    user: {
      create: jest.Mock;
      delete: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    refreshToken: {
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    emailVerificationToken: {
      create: jest.Mock;
      deleteMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const bcryptHash = bcrypt.hash as unknown as jest.Mock;
  const bcryptCompare = bcrypt.compare as unknown as jest.Mock;
  const jwtSignAsync = mockJwtService.signAsync as jest.Mock;
  const jwtVerifyAsync = mockJwtService.verifyAsync as jest.Mock;
  const sendMail = mockMailService.sendMail as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    bcryptHash.mockReset();
    bcryptCompare.mockReset();
    jwtSignAsync.mockReset();
    jwtVerifyAsync.mockReset();
    sendMail.mockReset();

    mockPrismaService.user.create.mockReset();
    mockPrismaService.user.delete.mockReset();
    mockPrismaService.user.findUnique.mockReset();
    mockPrismaService.user.update.mockReset();
    mockPrismaService.refreshToken.create.mockReset();
    mockPrismaService.refreshToken.findMany.mockReset();
    mockPrismaService.refreshToken.update.mockReset();
    mockPrismaService.emailVerificationToken.create.mockReset();
    mockPrismaService.emailVerificationToken.deleteMany.mockReset();
    mockPrismaService.emailVerificationToken.findUnique.mockReset();
    mockPrismaService.emailVerificationToken.update.mockReset();
    mockPrismaService.$transaction.mockReset();

    bcryptHash.mockResolvedValue('hashed-value');
    bcryptCompare.mockResolvedValue(true);
    mockPrismaService.user.create.mockResolvedValue(unverifiedUser);
    mockPrismaService.user.delete.mockResolvedValue(undefined);
    mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
    mockPrismaService.user.update.mockResolvedValue({
      ...mockUser,
      emailVerifiedAt: new Date('2026-04-02T00:00:00.000Z'),
    });
    mockPrismaService.refreshToken.create.mockResolvedValue(undefined);
    mockPrismaService.refreshToken.findMany.mockResolvedValue([
      activeRefreshToken,
    ]);
    mockPrismaService.refreshToken.update.mockResolvedValue(undefined);
    mockPrismaService.emailVerificationToken.create.mockResolvedValue({
      id: 'verification-token-1',
    });
    mockPrismaService.emailVerificationToken.deleteMany.mockResolvedValue({
      count: 0,
    });
    mockPrismaService.emailVerificationToken.update.mockResolvedValue({
      id: 'verification-token-1',
    });
    mockPrismaService.emailVerificationToken.findUnique.mockResolvedValue({
      id: 'verification-token-1',
      userId: 'user-1',
      tokenHash: 'hashed-token',
      redirectPath: '/app/projects/project-1',
      expiresAt: new Date('2026-04-08T00:00:00.000Z'),
      consumedAt: null,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      user: mockUser,
    });
    sendMail.mockResolvedValue(undefined);
    jwtVerifyAsync.mockResolvedValue({
      sub: 'user-1',
      email: 'jane@example.com',
      role: 'MEMBER',
    });
    mockPrismaService.$transaction.mockImplementation(
      (
        input:
          | Promise<unknown>[]
          | ((client: typeof mockPrismaService) => Promise<unknown>),
      ) =>
        Array.isArray(input) ? Promise.all(input) : input(mockPrismaService),
    );
  });

  it('creates an unverified member and sends a verification email during signup', async () => {
    const authService = createAuthService();

    const result = await authService.signup({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'StrongPass1',
      redirectPath: '/app/projects/project-1',
    });

    expect(mockPrismaService.user.create).toHaveBeenCalledWith({
      data: {
        id: expect.any(String),
        name: 'Jane Doe',
        email: 'jane@example.com',
        passwordHash: 'hashed-value',
        role: 'MEMBER',
        emailVerifiedAt: null,
      },
    });
    expect(
      mockPrismaService.emailVerificationToken.deleteMany,
    ).toHaveBeenCalled();
    expect(
      mockPrismaService.emailVerificationToken.create,
    ).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        tokenHash: expect.any(String),
        redirectPath: '/app/projects/project-1',
        expiresAt: expect.any(Date),
      }),
    });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'jane@example.com',
        subject: 'Verify your Archon account',
      }),
    );
    expect(result).toEqual({
      message: 'Check your email to verify your account',
      email: 'jane@example.com',
      emailVerificationRequired: true,
    });
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

  it('rolls back the new user when verification mail setup fails during signup', async () => {
    sendMail.mockRejectedValue(new Error('SMTP is not configured'));
    const authService = createAuthService();

    await expect(
      authService.signup({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'StrongPass1',
      }),
    ).rejects.toThrow('SMTP is not configured');

    expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
      where: {
        id: 'user-1',
      },
    });
  });

  it('logs in a verified user and persists a fresh refresh token', async () => {
    jwtSignAsync
      .mockResolvedValueOnce('login-access-token')
      .mockResolvedValueOnce('login-refresh-token');
    bcryptHash.mockResolvedValueOnce('hashed-login-refresh-token');
    const authService = createAuthService();

    const result = await authService.login({
      email: 'jane@example.com',
      password: 'StrongPass1',
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
        emailVerifiedAt: '2026-04-01T00:00:00.000Z',
      },
      accessToken: 'login-access-token',
      refreshToken: 'login-refresh-token',
      refreshTokenExpiresAt: expect.any(Date),
    });
  });

  it('rejects login when email verification is still pending', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(unverifiedUser);
    const authService = createAuthService();

    await expect(
      authService.login({
        email: 'jane@example.com',
        password: 'StrongPass1',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'FORBIDDEN',
        message: 'Email verification is required before login',
        details: {
          needsVerification: true,
          email: 'jane@example.com',
        },
      },
    });
  });

  it('rejects invalid email or password during login with a generic 401', async () => {
    bcryptCompare.mockResolvedValueOnce(false);
    const authService = createAuthService();

    await expect(
      authService.login({
        email: 'jane@example.com',
        password: 'WrongPassword1',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rotates the refresh token and returns a new access token', async () => {
    jwtSignAsync
      .mockResolvedValueOnce('rotated-access-token')
      .mockResolvedValueOnce('rotated-refresh-token');
    bcryptHash.mockResolvedValueOnce('hashed-rotated-refresh-token');
    const authService = createAuthService();

    const result = await authService.refresh('existing-refresh-token');

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

  it('confirms email verification and consumes the verification token', async () => {
    const authService = createAuthService();

    const result = await authService.confirmEmailVerification({
      token: 'verification-token',
    });

    expect(mockPrismaService.user.update).toHaveBeenCalledWith({
      where: {
        id: 'user-1',
      },
      data: {
        emailVerifiedAt: expect.any(Date),
      },
    });
    expect(
      mockPrismaService.emailVerificationToken.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 'verification-token-1',
      },
      data: {
        consumedAt: expect.any(Date),
      },
    });
    expect(result).toEqual({
      verified: true,
      email: 'jane@example.com',
      redirectPath: '/app/projects/project-1',
    });
  });

  it('resends verification mail only for existing unverified accounts', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(unverifiedUser);
    const authService = createAuthService();

    const result = await authService.resendEmailVerification({
      email: 'jane@example.com',
      redirectPath: '/app',
    });

    expect(
      mockPrismaService.emailVerificationToken.deleteMany,
    ).toHaveBeenCalled();
    expect(mockPrismaService.emailVerificationToken.create).toHaveBeenCalled();
    expect(sendMail).toHaveBeenCalled();
    expect(result).toEqual({
      message: 'If the account needs verification, a new email is on the way.',
    });
  });

  it('returns the current user for a valid access token', async () => {
    const authService = createAuthService();

    const result = await authService.getCurrentUser('access-token');

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

  function createAuthService() {
    return new AuthService(
      mockPrismaService,
      mockJwtService,
      mockConfigService,
      mockMailService,
    );
  }
});
