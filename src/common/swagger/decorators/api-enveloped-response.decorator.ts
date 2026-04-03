import { applyDecorators, type HttpStatus, type Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiErrorPayloadDto, ApiMetaDto } from '../models/api-envelope.models';

type ApiEnvelopedResponseOptions = {
  description: string;
  extraModels?: Type<unknown>[];
  status?: HttpStatus | number;
  type: Type<unknown>;
};

export function ApiEnvelopedResponse({
  description,
  extraModels = [],
  status = 200,
  type,
}: ApiEnvelopedResponseOptions) {
  return applyDecorators(
    ApiExtraModels(ApiMetaDto, ApiErrorPayloadDto, type, ...extraModels),
    ApiResponse({
      status,
      description,
      schema: {
        type: 'object',
        required: ['success', 'data', 'meta', 'error'],
        properties: {
          success: {
            type: 'boolean',
            enum: [true],
            example: true,
          },
          data: {
            $ref: getSchemaPath(type),
          },
          meta: {
            $ref: getSchemaPath(ApiMetaDto),
          },
          error: {
            allOf: [
              {
                $ref: getSchemaPath(ApiErrorPayloadDto),
              },
            ],
            nullable: true,
            example: null,
          },
        },
      },
    }),
  );
}
