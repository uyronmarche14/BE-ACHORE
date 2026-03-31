import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../service/auth.service';

describe('AuthController', () => {
  let authController: AuthController;

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
  });

  it('returns the signup response and sets the refresh token cookie', async () => {
    const response = {
      cookie: jest.fn(),
    } as never;

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
    expect((response as { cookie: jest.Mock }).cookie).toHaveBeenCalledWith(
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
});
