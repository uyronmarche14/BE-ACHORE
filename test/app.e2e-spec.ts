import {
  BadRequestException,
  NotFoundException,
  type ArgumentMetadata,
  type ArgumentsHost,
  type CallHandler,
  type ExecutionContext,
  type INestApplication,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { IsNotEmpty, IsString } from 'class-validator';
import { of, lastValueFrom } from 'rxjs';
import { AppModule } from './../src/app.module';
import { REQUEST_ID_HEADER } from './../src/common/constants/request.constants';
import { GlobalExceptionFilter } from './../src/common/filters/global-exception.filter';
import { ResponseEnvelopeInterceptor } from './../src/common/interceptors/response-envelope.interceptor';
import { RequestIdMiddleware } from './../src/common/middleware/request-id.middleware';
import { createGlobalValidationPipe } from './../src/common/pipes/global-validation.pipe';
import type { RequestWithContext } from './../src/common/types/request-context.type';
import { PrismaService } from './../src/database/prisma.service';
import { HealthController } from './../src/modules/health/controller/health.controller';

class EchoBodyDto {
  @IsString()
  @IsNotEmpty()
  title!: string;
}

describe('App bootstrap (e2e)', () => {
  let app: INestApplication | undefined;
  let healthController: HealthController;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(),
        $connect: jest.fn(),
        $disconnect: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    healthController = app.get(HealthController);
  });

  it('wraps health data in the normalized success envelope', async () => {
    const interceptor = new ResponseEnvelopeInterceptor();
    const request = {
      requestId: 'req_health_test',
      headers: {},
    } as RequestWithContext;
    const executionContext = createExecutionContext(request);
    const callHandler = {
      handle: () => of(healthController.getHealth()),
    } satisfies CallHandler;

    const response = await lastValueFrom(
      interceptor.intercept(executionContext, callHandler),
    );

    expect(response.success).toBe(true);
    expect(response.data).toEqual({
      status: 'ok',
      service: 'archon-backend',
    });
    expect(response.meta.requestId).toBe('req_health_test');
    expect(response.meta.timestamp).toEqual(expect.any(String));
    expect(response.error).toBeNull();
  });

  it('returns validation failures in the standard 400 envelope shape', async () => {
    const validationPipe = createGlobalValidationPipe();
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: EchoBodyDto,
      data: undefined,
    };

    await expect(
      validationPipe.transform(
        {
          title: '',
          extra: 'unexpected',
        },
        metadata,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    try {
      await validationPipe.transform(
        {
          title: '',
          extra: 'unexpected',
        },
        metadata,
      );
    } catch (error) {
      const exception = error as BadRequestException;
      const response = exception.getResponse() as {
        code: string;
        message: string;
        details: Record<string, string[]>;
      };

      expect(exception.getStatus()).toBe(400);
      expect(response.code).toBe('VALIDATION_ERROR');
      expect(response.message).toBe('Request validation failed');
      expect(response.details.title).toContain('title should not be empty');
      expect(response.details.extra).toContain(
        'property extra should not exist',
      );
    }
  });

  it('adds request IDs and metadata to normalized error responses', () => {
    const middleware = new RequestIdMiddleware();
    const exceptionFilter = new GlobalExceptionFilter();
    const request = {
      headers: {},
    } as RequestWithContext;
    const response = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    middleware.use(request, response as never, next);

    expect(next).toHaveBeenCalled();
    expect(request.requestId).toEqual(expect.stringMatching(/^req_/));
    expect(response.setHeader).toHaveBeenCalledWith(
      REQUEST_ID_HEADER,
      request.requestId,
    );

    exceptionFilter.catch(
      new NotFoundException('Test resource not found'),
      createArgumentsHost(request, response),
    );

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      data: null,
      meta: {
        requestId: request.requestId,
        timestamp: expect.any(String) as unknown,
      },
      error: {
        code: 'NOT_FOUND',
        message: 'Test resource not found',
        details: null,
      },
    });
  });

  afterEach(async () => {
    await app?.close();
  });
});

function createExecutionContext(request: RequestWithContext): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => undefined,
      getNext: () => undefined,
    }),
  } as ExecutionContext;
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
  } as ArgumentsHost;
}
