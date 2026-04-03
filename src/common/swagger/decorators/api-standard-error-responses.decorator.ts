import { applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse } from '@nestjs/swagger';
import { ApiErrorEnvelopeDto } from '../models/api-envelope.models';

type StandardErrorStatus = 400 | 401 | 403 | 404 | 409 | 429 | 500;

const DEFAULT_ERROR_DESCRIPTIONS: Record<StandardErrorStatus, string> = {
  400: 'The request payload or query parameters are invalid.',
  401: 'Authentication is required or the provided credentials are invalid.',
  403: 'The authenticated user does not have access to this resource.',
  404: 'The requested resource could not be found.',
  409: 'The request conflicts with the current resource state.',
  429: 'The request was rate limited. Try again later.',
  500: 'An unexpected server error occurred.',
};

export function ApiStandardErrorResponses(
  statuses: StandardErrorStatus[],
  descriptions: Partial<Record<StandardErrorStatus, string>> = {},
) {
  return applyDecorators(
    ApiExtraModels(ApiErrorEnvelopeDto),
    ...statuses.map((status) =>
      ApiResponse({
        status,
        description: descriptions[status] ?? DEFAULT_ERROR_DESCRIPTIONS[status],
        type: ApiErrorEnvelopeDto,
      }),
    ),
  );
}
