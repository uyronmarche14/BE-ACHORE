import {
  ArgumentsHost,
  Controller,
  Post,
  UseGuards,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { configureApplication } from '../src/common/bootstrap/configure-application';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { AuthRateLimit } from '../src/modules/auth/decorators/auth-rate-limit.decorator';
import { AuthRateLimitGuard } from '../src/modules/auth/guards/auth-rate-limit.guard';
import {
  mapLoginResponse,
  mapRefreshResponse,
  mapSignupResponse,
} from '../src/modules/auth/mapper/auth.mapper';
import { AuthRateLimitService } from '../src/modules/auth/service/auth-rate-limit.service';
import { AuthService } from '../src/modules/auth/service/auth.service';
import type {
  LoginResponse,
  RefreshAccessTokenResponse,
  SignupResponse,
} from '../src/modules/auth/types/auth-response.type';
import type { RequestWithContext } from '../src/common/types/request-context.type';
import type { INestApplication } from '@nestjs/common';

@Controller('auth')
class AuthRateLimitProbeController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit({
    key: 'signup',
    limit: 5,
    windowMs: 60_000,
  })
  async signup(): Promise<SignupResponse> {
    const signupResult = await this.authService.signup({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'StrongPass1',
    });

    return mapSignupResponse(signupResult);
  }

  @Post('login')
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit({
    key: 'login',
    limit: 5,
    windowMs: 60_000,
  })
  async login(): Promise<LoginResponse> {
    const loginResult = await this.authService.login({
      email: 'jane@example.com',
      password: 'StrongPass1',
    });

    return mapLoginResponse(loginResult);
  }

  @Post('refresh')
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit({
    key: 'refresh',
    limit: 20,
    windowMs: 60_000,
  })
  async refresh(): Promise<RefreshAccessTokenResponse> {
    const refreshResult = await this.authService.refresh(
      'existing-refresh-token',
    );

    return mapRefreshResponse(refreshResult.accessToken);
  }
}

describe('Auth rate limiting (e2e)', () => {
  let app: INestApplication;
  let controller: AuthRateLimitProbeController;
  let authRateLimitGuard: AuthRateLimitGuard;
  let authRateLimitService: AuthRateLimitService;
  let mockAuthService: {
    signup: jest.Mock;
    login: jest.Mock;
    refresh: jest.Mock;
  };

  beforeEach(async () => {
    mockAuthService = {
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
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthRateLimitProbeController],
      providers: [
        Reflector,
        AuthRateLimitGuard,
        AuthRateLimitService,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn(),
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();

    controller = moduleFixture.get(AuthRateLimitProbeController);
    authRateLimitGuard = moduleFixture.get(AuthRateLimitGuard);
    authRateLimitService = moduleFixture.get(AuthRateLimitService);
    authRateLimitService.reset();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns a throttled error envelope after five signup attempts from the same client', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        executeRateLimitedRoute({
          controller,
          authRateLimitGuard,
          method: 'signup',
          clientIp: '203.0.113.10',
        }),
      ).resolves.toEqual({
        message: 'Check your email to verify your account',
        email: 'jane@example.com',
        emailVerificationRequired: true,
      });
    }

    const response = createResponse();
    const request = createRequest('203.0.113.10');
    const exceptionFilter = new GlobalExceptionFilter();

    try {
      await executeRateLimitedRoute({
        controller,
        authRateLimitGuard,
        method: 'signup',
        clientIp: '203.0.113.10',
      });
    } catch (error) {
      exceptionFilter.catch(error, createArgumentsHost(request, response));
    }

    expect(response.status).toHaveBeenCalledWith(429);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      data: null,
      meta: {
        requestId: request.requestId as string,
        timestamp: expect.any(String) as unknown,
      },
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many auth attempts. Please try again later.',
        details: null,
      },
    });
    expect(mockAuthService.signup).toHaveBeenCalledTimes(5);
  });

  it('returns 429 after five login attempts from the same client', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await executeRateLimitedRoute({
        controller,
        authRateLimitGuard,
        method: 'login',
        clientIp: '203.0.113.11',
      });
    }

    await expect(
      executeRateLimitedRoute({
        controller,
        authRateLimitGuard,
        method: 'login',
        clientIp: '203.0.113.11',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'RATE_LIMITED',
        message: 'Too many auth attempts. Please try again later.',
      },
    });
    expect(mockAuthService.login).toHaveBeenCalledTimes(5);
  });

  it('allows twenty refresh attempts and throttles the twenty-first', async () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await executeRateLimitedRoute({
        controller,
        authRateLimitGuard,
        method: 'refresh',
        clientIp: '203.0.113.12',
      });
    }

    await expect(
      executeRateLimitedRoute({
        controller,
        authRateLimitGuard,
        method: 'refresh',
        clientIp: '203.0.113.12',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'RATE_LIMITED',
        message: 'Too many auth attempts. Please try again later.',
      },
    });
    expect(mockAuthService.refresh).toHaveBeenCalledTimes(20);
  });
});

async function executeRateLimitedRoute({
  controller,
  authRateLimitGuard,
  method,
  clientIp,
}: {
  controller: AuthRateLimitProbeController;
  authRateLimitGuard: AuthRateLimitGuard;
  method: 'signup' | 'login' | 'refresh';
  clientIp: string;
}) {
  const request = createRequest(clientIp);
  const response = createPassthroughResponse();
  const controllerMethod =
    method === 'signup'
      ? (Reflect.get(AuthRateLimitProbeController.prototype, 'signup') as (
          ...args: unknown[]
        ) => unknown)
      : method === 'login'
        ? (Reflect.get(AuthRateLimitProbeController.prototype, 'login') as (
            ...args: unknown[]
          ) => unknown)
        : (Reflect.get(AuthRateLimitProbeController.prototype, 'refresh') as (
            ...args: unknown[]
          ) => unknown);
  const executionContext = createExecutionContext(
    AuthRateLimitProbeController,
    controllerMethod,
    request,
    response,
  );

  await Promise.resolve(authRateLimitGuard.canActivate(executionContext));

  if (method === 'signup') {
    return AuthRateLimitProbeController.prototype.signup.call(controller);
  }

  if (method === 'login') {
    return AuthRateLimitProbeController.prototype.login.call(controller);
  }

  return AuthRateLimitProbeController.prototype.refresh.call(controller);
}

function createRequest(clientIp: string): RequestWithContext & {
  headers: Record<string, string>;
  ip: string;
} {
  return {
    requestId: 'req_rate_limit_test',
    headers: {
      'x-forwarded-for': clientIp,
    },
    ip: clientIp,
    socket: {
      remoteAddress: clientIp,
    },
  } as unknown as RequestWithContext & {
    headers: Record<string, string>;
    ip: string;
  };
}

function createPassthroughResponse() {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response;
}

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

function createExecutionContext(
  controllerClass: typeof AuthRateLimitProbeController,
  handler: (...args: unknown[]) => unknown,
  request: RequestWithContext,
  response: Response,
): ExecutionContext {
  return {
    getClass: () => controllerClass,
    getHandler: () => handler,
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

function createArgumentsHost(
  request: RequestWithContext,
  response: {
    status: jest.Mock;
    json: jest.Mock;
  },
): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
      getNext: () => undefined,
    }),
  } as unknown as ArgumentsHost;
}
