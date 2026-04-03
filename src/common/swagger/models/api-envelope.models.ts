import { ApiProperty } from '@nestjs/swagger';

const API_ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
] as const;

export class ApiMetaDto {
  @ApiProperty({
    description: 'Unique request identifier included with each API response.',
    example: 'req_01JX3F0T3K2YRV0S8YGHM8W1FQ',
  })
  requestId!: string;

  @ApiProperty({
    description: 'Timestamp when the API envelope was created.',
    example: '2026-04-03T09:15:23.000Z',
    format: 'date-time',
  })
  timestamp!: string;
}

export class ApiErrorPayloadDto {
  @ApiProperty({
    description: 'Stable machine-readable application error code.',
    enum: API_ERROR_CODES,
    example: 'VALIDATION_ERROR',
  })
  code!: (typeof API_ERROR_CODES)[number];

  @ApiProperty({
    description: 'Human-readable error message.',
    example: 'Request validation failed',
  })
  message!: string;

  @ApiProperty({
    description:
      'Structured error details keyed by field or context when additional data is available.',
    nullable: true,
    oneOf: [
      {
        type: 'object',
        additionalProperties: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
      {
        type: 'object',
        additionalProperties: true,
      },
    ],
    example: {
      email: ['email must be an email'],
    },
  })
  details!: Record<string, unknown> | null;
}

export class ApiErrorEnvelopeDto {
  @ApiProperty({
    description: 'Indicates the request failed.',
    enum: [false],
    example: false,
  })
  success!: false;

  @ApiProperty({
    description: 'Error responses never include a data payload.',
    nullable: true,
    example: null,
    type: 'object',
    additionalProperties: true,
  })
  data!: null;

  @ApiProperty({
    description: 'Per-request response metadata.',
    type: () => ApiMetaDto,
  })
  meta!: ApiMetaDto;

  @ApiProperty({
    description: 'Application error payload.',
    type: () => ApiErrorPayloadDto,
  })
  error!: ApiErrorPayloadDto;
}
