import { ValidationPipe } from '@nestjs/common';
import type { ValidationError } from '@nestjs/common';
import { formatValidationErrors } from '../utils/api-error.util';
import { createValidationException } from '../utils/api-exception.util';

export function createGlobalValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    validationError: {
      target: false,
      value: false,
    },
    exceptionFactory: (validationErrors: ValidationError[]) =>
      createValidationException({
        message: 'Request validation failed',
        details: formatValidationErrors(validationErrors),
      }),
  });
}
