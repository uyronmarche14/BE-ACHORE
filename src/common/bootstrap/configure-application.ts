import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import { getAppRuntimeConfig } from '../../config/runtime-config';
import { GlobalExceptionFilter } from '../filters/global-exception.filter';
import { ResponseEnvelopeInterceptor } from '../interceptors/response-envelope.interceptor';
import { createGlobalValidationPipe } from '../pipes/global-validation.pipe';

export function configureApplication(app: INestApplication) {
  const configService = getConfigService(app);
  const { nodeEnv, trustProxyHops } = configService
    ? getAppRuntimeConfig(configService)
    : {
        nodeEnv: 'development' as const,
        trustProxyHops: 0,
      };
  const expressApp = app.getHttpAdapter().getInstance() as {
    disable: (setting: string) => void;
    set: (setting: string, value: unknown) => void;
  };

  expressApp.disable('x-powered-by');
  expressApp.set('trust proxy', trustProxyHops);

  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader(
      'Permissions-Policy',
      'camera=(), geolocation=(), microphone=()',
    );
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-site');

    // HSTS only makes sense once requests are actually terminated over HTTPS.
    if (nodeEnv === 'production') {
      response.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
    }

    next();
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(createGlobalValidationPipe());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
}

function getConfigService(app: INestApplication) {
  try {
    return app.get(ConfigService, {
      strict: false,
    });
  } catch {
    // Some lightweight test harnesses bootstrap only the controller under test.
    return undefined;
  }
}
