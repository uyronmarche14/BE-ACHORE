import type { INestApplication } from '@nestjs/common';
import { GlobalExceptionFilter } from '../filters/global-exception.filter';
import { ResponseEnvelopeInterceptor } from '../interceptors/response-envelope.interceptor';
import { createGlobalValidationPipe } from '../pipes/global-validation.pipe';

export function configureApplication(app: INestApplication) {
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(createGlobalValidationPipe());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
}
