import { TaskLogEventType } from '@prisma/client';
import {
  ApiProperty,
  type ApiPropertyOptions,
  getSchemaPath,
} from '@nestjs/swagger';

export class SwaggerTaskLogActorDto {
  @ApiProperty({
    example: 'user_2bdb3b8d-8a3d-4354-b18f-9497b9a6ec82',
  })
  id!: string;

  @ApiProperty({
    example: 'Jane Doe',
  })
  name!: string;
}

export class SwaggerTaskLogAssigneeValueDto {
  @ApiProperty({
    example: 'user_2bdb3b8d-8a3d-4354-b18f-9497b9a6ec82',
  })
  id!: string;

  @ApiProperty({
    example: 'Jane Doe',
  })
  name!: string;
}

export function createTaskLogValueSchema(
  description: string,
): ApiPropertyOptions {
  return {
    description,
    nullable: true,
    oneOf: [
      {
        type: 'string',
      },
      {
        type: 'number',
      },
      {
        type: 'boolean',
      },
      {
        $ref: getSchemaPath(SwaggerTaskLogAssigneeValueDto),
      },
    ],
    example: null,
  };
}

export class SwaggerTaskLogEntryResponseDto {
  @ApiProperty({
    example: 'log_8b2f8f3e-ff1f-46d6-a864-85f95da60f0f',
  })
  id!: string;

  @ApiProperty({
    enum: TaskLogEventType,
    example: TaskLogEventType.STATUS_CHANGED,
  })
  eventType!: TaskLogEventType;

  @ApiProperty({
    nullable: true,
    example: 'status',
  })
  fieldName!: string | null;

  @ApiProperty(
    createTaskLogValueSchema('Previous value recorded for the task log entry.'),
  )
  oldValue!: unknown;

  @ApiProperty(
    createTaskLogValueSchema('Next value recorded for the task log entry.'),
  )
  newValue!: unknown;

  @ApiProperty({
    example: 'Jane Doe moved the task from Todo to In progress',
  })
  summary!: string;

  @ApiProperty({
    type: () => SwaggerTaskLogActorDto,
  })
  actor!: SwaggerTaskLogActorDto;

  @ApiProperty({
    example: '2026-04-03T09:16:45.000Z',
    format: 'date-time',
  })
  createdAt!: string;
}

export class SwaggerTaskLogsResponseDto {
  @ApiProperty({
    type: () => [SwaggerTaskLogEntryResponseDto],
  })
  items!: SwaggerTaskLogEntryResponseDto[];

  @ApiProperty({
    example: 1,
  })
  page!: number;

  @ApiProperty({
    example: 10,
  })
  pageSize!: number;

  @ApiProperty({
    example: true,
  })
  hasMore!: boolean;
}
