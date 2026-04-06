import { ApiProperty } from '@nestjs/swagger';

export class SwaggerTaskNotificationActorDto {
  @ApiProperty({
    example: 'user_2bdb3b8d-8a3d-4354-b18f-9497b9a6ec82',
  })
  id!: string;

  @ApiProperty({
    example: 'Jane Doe',
  })
  name!: string;
}

export class SwaggerTaskNotificationProjectDto {
  @ApiProperty({
    example: 'proj_7b0be4ef-8eb6-4db1-a442-c534a53e7cf1',
  })
  id!: string;

  @ApiProperty({
    example: 'Launch Website',
  })
  name!: string;
}

export class SwaggerTaskNotificationTaskDto {
  @ApiProperty({
    example: 'task_a8d2f20f-d10e-4041-a9b7-97c8c160db8d',
  })
  id!: string;

  @ApiProperty({
    example: 'Ship launch checklist',
  })
  title!: string;
}

export class SwaggerTaskAssignmentNotificationResponseDto {
  @ApiProperty({
    example: 'log_8b2f8f3e-ff1f-46d6-a864-85f95da60f0f',
  })
  id!: string;

  @ApiProperty({
    enum: ['task_assigned'],
    example: 'task_assigned',
  })
  type!: 'task_assigned';

  @ApiProperty({
    example: '2026-04-03T09:16:45.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    type: () => SwaggerTaskNotificationActorDto,
  })
  actor!: SwaggerTaskNotificationActorDto;

  @ApiProperty({
    type: () => SwaggerTaskNotificationProjectDto,
  })
  project!: SwaggerTaskNotificationProjectDto;

  @ApiProperty({
    type: () => SwaggerTaskNotificationTaskDto,
  })
  task!: SwaggerTaskNotificationTaskDto;
}

export class SwaggerTaskAssignmentNotificationsResponseDto {
  @ApiProperty({
    type: () => SwaggerTaskAssignmentNotificationResponseDto,
    isArray: true,
  })
  items!: SwaggerTaskAssignmentNotificationResponseDto[];
}
