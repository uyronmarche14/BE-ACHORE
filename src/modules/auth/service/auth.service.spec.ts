import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../../database/prisma.service';

jest.mock('bcrypt', () => ({
  __esModule: true,
  default: {
    hash: jest.fn(),
  },
}));

describe('AuthService', () => {
  const mockUser = {
    id: 'user-1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    passwordHash: 'hashed-password',
    role: 'MEMBER' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createMockTransaction = () => ({
    user: {
      create: jest
        .fn<
          (args: {
            data: {
              name: string;
              email: string;
              passwordHash: string;
              role: 'MEMBER';
            };
          }) => Promise<typeof mockUser>
        >()
        .mockResolvedValue(mockUser),
    },
    refreshToken: {
      create: jest
        .fn<
          (args: {
            data: {
              userId: string;
              tokenHash: string;
              expiresAt: Date;
            };
          }) => Promise<void>
        >()
        .mockResolvedValue(undefined),
    },
  });

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
    signAsync: jest
      .fn()
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token'),
  } as unknown as JwtService;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a member, hashes credentials, and persists the refresh token', async () => {
    let persistedRefreshTokenData: {
      userId: string;
      tokenHash: string;
      expiresAt: Date;
    } | null = null;
    const transaction = createMockTransaction();
    transaction.refreshToken.create.mockImplementation(
      ({
        data,
      }: {
        data: {
          userId: string;
          tokenHash: string;
          expiresAt: Date;
        };
      }) => {
        persistedRefreshTokenData = data;

        return Promise.resolve();
      },
    );
    const mockPrismaService = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) =>
        callback(transaction),
      ),
    } as unknown as PrismaService;

    const bcryptHash = jest.mocked(bcrypt.hash);
    bcryptHash
      .mockResolvedValueOnce('hashed-password')
      .mockResolvedValueOnce('hashed-refresh-token');

    const authService = new AuthService(
      mockPrismaService,
      mockJwtService,
      mockConfigService,
    );

    const result = await authService.signup({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'StrongPass1',
    });

    expect(transaction.user.create).toHaveBeenCalledWith({
      data: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        passwordHash: 'hashed-password',
        role: 'MEMBER',
      },
    });
    expect(persistedRefreshTokenData).toBeDefined();
    expect(persistedRefreshTokenData?.userId).toBe('user-1');
    expect(persistedRefreshTokenData?.tokenHash).toBe('hashed-refresh-token');
    expect(persistedRefreshTokenData?.expiresAt).toBeInstanceOf(Date);
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
    const bcryptHash = jest.mocked(bcrypt.hash);
    bcryptHash.mockResolvedValue('hashed-password');

    const mockPrismaService = {
      $transaction: jest.fn().mockRejectedValue({ code: 'P2002' }),
    } as unknown as PrismaService;

    const authService = new AuthService(
      mockPrismaService,
      mockJwtService,
      mockConfigService,
    );

    await expect(
      authService.signup({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'StrongPass1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
