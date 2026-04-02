import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  ApiErrorCode,
  ApiErrorDetails,
  ApiErrorPayload,
} from '../types/api-envelope.type';

type ApiExceptionOptions = {
  message: string;
  details?: ApiErrorDetails;
};

function buildApiErrorPayload(
  code: ApiErrorCode,
  options: ApiExceptionOptions,
): ApiErrorPayload {
  return {
    code,
    message: options.message,
    details: options.details ?? null,
  };
}

export function createValidationException(options: ApiExceptionOptions) {
  return new BadRequestException(
    buildApiErrorPayload('VALIDATION_ERROR', options),
  );
}

export function createUnauthenticatedException(options: ApiExceptionOptions) {
  return new UnauthorizedException(
    buildApiErrorPayload('UNAUTHENTICATED', options),
  );
}

export function createForbiddenException(options: ApiExceptionOptions) {
  return new ForbiddenException(buildApiErrorPayload('FORBIDDEN', options));
}

export function createNotFoundException(options: ApiExceptionOptions) {
  return new NotFoundException(buildApiErrorPayload('NOT_FOUND', options));
}

export function createConflictException(options: ApiExceptionOptions) {
  return new ConflictException(buildApiErrorPayload('CONFLICT', options));
}

export function createRateLimitedException(options: ApiExceptionOptions) {
  return new HttpException(
    buildApiErrorPayload('RATE_LIMITED', options),
    HttpStatus.TOO_MANY_REQUESTS,
  );
}

export function createInternalException(options: ApiExceptionOptions) {
  return new InternalServerErrorException(
    buildApiErrorPayload('INTERNAL_ERROR', options),
  );
}
