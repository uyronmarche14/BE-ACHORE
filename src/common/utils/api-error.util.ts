import type { ValidationError } from '@nestjs/common';
import type { ApiErrorCode } from '../types/api-envelope.type';

export function mapHttpStatusToErrorCode(statusCode: number): ApiErrorCode {
  switch (statusCode) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
      return 'UNAUTHENTICATED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 429:
      return 'RATE_LIMITED';
    default:
      return 'INTERNAL_ERROR';
  }
}

export function formatValidationErrors(
  validationErrors: ValidationError[],
  parentPath?: string,
): Record<string, string[]> {
  return validationErrors.reduce<Record<string, string[]>>((details, error) => {
    const propertyPath = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      details[propertyPath] = Object.values(error.constraints);
    }

    if (error.children?.length) {
      Object.assign(
        details,
        formatValidationErrors(error.children, propertyPath),
      );
    }

    return details;
  }, {});
}
