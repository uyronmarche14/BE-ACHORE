import { IncomingMessage, ServerResponse } from 'node:http';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { Duplex } from 'node:stream';
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

type OpenApiDocument = {
  components: {
    schemas: Record<string, Record<string, unknown>>;
    securitySchemes: Record<string, Record<string, unknown>>;
  };
  paths: Record<string, Record<string, Record<string, unknown>>>;
};

type BuiltAppModule = typeof import('../src/app.module');
type BuiltConfigureApplicationModule =
  typeof import('../src/common/bootstrap/configure-application');
type BuiltConfigureSwaggerModule =
  typeof import('../src/common/bootstrap/configure-swagger');
type BuiltPrismaServiceModule = typeof import('../src/database/prisma.service');

type HttpRouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  next: (error?: Error) => void,
) => void;

type ResponseChunk = string | Uint8Array;
type ResponseWriteCallback = (error?: Error | null) => void;
type ResponseWriteEncoding = BufferEncoding | ResponseWriteCallback;
type ResponseEndCallback = () => void;
type ResponseEndEncoding = BufferEncoding | ResponseEndCallback;

const ORIGINAL_ENV = { ...process.env };
const requireBuiltModule = createRequire(__filename);

describe('Swagger docs (e2e)', () => {
  let app: INestApplication | undefined;

  beforeAll(async () => {
    process.env = {
      ...ORIGINAL_ENV,
      PORT: '4001',
      APP_URL: 'http://localhost:4001',
      FRONTEND_URL: 'http://localhost:3000',
      DATABASE_URL: 'mysql://dowinn:dowinn@127.0.0.1:3308/dowinn',
      JWT_ACCESS_SECRET: 'test-access-secret-12345',
      JWT_REFRESH_SECRET: 'test-refresh-secret-12345',
      REFRESH_COOKIE_NAME: 'archon_refresh_token_test',
      SWAGGER_ENABLED: 'true',
      NODE_ENV: 'test',
    };

    const { AppModule } = await loadBuiltModule<BuiltAppModule>(
      '../dist/src/app.module.js',
    );
    const { configureApplication } =
      await loadBuiltModule<BuiltConfigureApplicationModule>(
        '../dist/src/common/bootstrap/configure-application.js',
      );
    const { configureSwagger } =
      await loadBuiltModule<BuiltConfigureSwaggerModule>(
        '../dist/src/common/bootstrap/configure-swagger.js',
      );
    const { PrismaService } = await loadBuiltModule<BuiltPrismaServiceModule>(
      '../dist/src/database/prisma.service.js',
    );

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
    configureApplication(app);
    configureSwagger(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    process.env = ORIGINAL_ENV;
  });

  it('serves the Swagger UI and publishes an accurate prefixed OpenAPI document', async () => {
    const httpHandler = app!.getHttpAdapter().getInstance() as HttpRouteHandler;
    const uiResponse = await invokeExpressRoute(httpHandler, '/api/v1/docs');

    expect(uiResponse.statusCode).toBeLessThan(400);

    const specResponse = await invokeExpressRoute(
      httpHandler,
      '/api/v1/docs-json',
    );

    expect(specResponse.statusCode).toBe(200);
    const document = JSON.parse(specResponse.body) as OpenApiDocument;

    expect(document.paths['/api/v1/health']).toBeDefined();
    expect(document.paths['/api/v1/auth/me']).toBeDefined();
    expect(document.paths['/api/v1/seed/init']).toBeUndefined();

    expect(document.components.securitySchemes.bearerAuth).toEqual(
      expect.objectContaining({
        type: 'http',
        scheme: 'bearer',
      }),
    );
    expect(document.components.securitySchemes.refreshCookieAuth).toEqual(
      expect.objectContaining({
        type: 'apiKey',
        in: 'cookie',
        name: 'archon_refresh_token_test',
      }),
    );

    expect(document.paths['/api/v1/auth/me'].get.security).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          bearerAuth: [],
        }),
      ]),
    );
    expect(document.paths['/api/v1/auth/refresh'].post.security).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          refreshCookieAuth: [],
        }),
      ]),
    );

    const loginRequestBody = document.paths['/api/v1/auth/login'].post
      .requestBody as {
      content: {
        'application/json': {
          schema: {
            $ref: string;
          };
        };
      };
    };

    expect(loginRequestBody.content['application/json'].schema.$ref).toBe(
      '#/components/schemas/LoginDto',
    );

    const loginSchema = document.components.schemas.LoginDto as {
      properties: Record<string, { type?: string; maxLength?: number }>;
    };
    expect(loginSchema.properties.email).toEqual(
      expect.objectContaining({
        type: 'string',
        maxLength: 190,
      }),
    );
    expect(loginSchema.properties.password).toEqual(
      expect.objectContaining({
        type: 'string',
      }),
    );

    const activityParameters = document.paths[
      '/api/v1/projects/{projectId}/activity'
    ].get.parameters as Array<{
      name: string;
      schema?: Record<string, unknown>;
    }>;

    expect(activityParameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'projectId',
        }),
        expect.objectContaining({
          name: 'page',
          schema: expect.objectContaining({
            type: 'integer',
          }) as Record<string, unknown>,
        }),
        expect.objectContaining({
          name: 'eventType',
        }),
        expect.objectContaining({
          name: 'q',
        }),
      ]),
    );

    const healthSuccessSchema = document.paths['/api/v1/health'].get.responses[
      '200'
    ] as {
      content: {
        'application/json': {
          schema: {
            properties: Record<string, Record<string, unknown>>;
          };
        };
      };
    };

    expect(
      healthSuccessSchema.content['application/json'].schema.properties.success,
    ).toEqual(
      expect.objectContaining({
        enum: [true],
      }),
    );
    expect(
      healthSuccessSchema.content['application/json'].schema.properties.data,
    ).toEqual(
      expect.objectContaining({
        $ref: '#/components/schemas/SwaggerHealthResponseDto',
      }),
    );
    expect(
      healthSuccessSchema.content['application/json'].schema.properties.meta,
    ).toEqual(
      expect.objectContaining({
        $ref: '#/components/schemas/ApiMetaDto',
      }),
    );
  }, 15_000);
});

class MockSocket extends Duplex {
  remoteAddress = '127.0.0.1';

  _read() {
    this.push(null);
  }

  _write(
    _chunk: Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ) {
    callback();
  }

  setTimeout() {
    return this;
  }

  setNoDelay() {
    return this;
  }

  setKeepAlive() {
    return this;
  }

  destroy() {
    return this;
  }
}

async function invokeExpressRoute(handler: HttpRouteHandler, url: string) {
  const socket = new MockSocket();
  const request = new IncomingMessage(socket);
  request.method = 'GET';
  request.url = url;
  request.headers = {
    host: 'localhost',
  };
  Object.assign(request, {
    connection: socket,
    socket,
  });

  const response = new ServerResponse(request);
  (
    response as ServerResponse & { assignSocket: (socket: MockSocket) => void }
  ).assignSocket(socket);
  const bodyChunks: Buffer[] = [];
  const originalWrite = response.write.bind(response);
  const originalEnd = response.end.bind(response);

  response.write = function write(
    chunk: ResponseChunk,
    encoding?: ResponseWriteEncoding,
    callback?: ResponseWriteCallback,
  ) {
    if (chunk) {
      bodyChunks.push(
        Buffer.isBuffer(chunk)
          ? chunk
          : Buffer.from(
              chunk,
              typeof encoding === 'string' ? encoding : undefined,
            ),
      );
    }

    return originalWrite(chunk, encoding, callback);
  };

  response.end = function end(
    chunk?: ResponseChunk,
    encoding?: ResponseEndEncoding,
    callback?: ResponseEndCallback,
  ) {
    if (chunk) {
      bodyChunks.push(
        Buffer.isBuffer(chunk)
          ? chunk
          : Buffer.from(
              chunk,
              typeof encoding === 'string' ? encoding : undefined,
            ),
      );
    }

    return originalEnd(chunk, encoding, callback);
  };

  await new Promise<void>((resolve, reject) => {
    response.on('finish', () => resolve());
    response.on('error', reject);
    handler(request, response, (error?: Error) => {
      if (error) {
        reject(error);
      }
    });
  });

  return {
    statusCode: response.statusCode,
    headers: response.getHeaders(),
    body: Buffer.concat(bodyChunks).toString('utf8'),
  };
}

async function loadBuiltModule<TModule>(
  relativePath: string,
): Promise<TModule> {
  return await Promise.resolve(
    requireBuiltModule(join(__dirname, relativePath)) as TModule,
  );
}
