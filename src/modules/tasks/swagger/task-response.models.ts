import { ApiProperty } from '@nestjs/swagger';

export class SwaggerTaskStatusDto {
  @ApiProperty({
    example: 'status_7b0be4ef-8eb6-4db1-a442-c534a53e7cf1',
  })
  id!: string;

  @ApiProperty({
    example: 'In Progress',
  })
  name!: string;

  @ApiProperty({
    example: 2,
  })
  position!: number;

  @ApiProperty({
    example: false,
  })
  isClosed!: boolean;
}

export class SwaggerTaskResponseDto {
  @ApiProperty({
    example: 'task_a8d2f20f-d10e-4041-a9b7-97c8c160db8d',
  })
  id!: string;

  @ApiProperty({
    example: 'proj_7b0be4ef-8eb6-4db1-a442-c534a53e7cf1',
  })
  projectId!: string;

  @ApiProperty({
    example: 'Ship launch checklist',
  })
  title!: string;

  @ApiProperty({
    nullable: true,
    example: 'Final review before launch',
  })
  description!: string | null;

  @ApiProperty({
    example: 'status_7b0be4ef-8eb6-4db1-a442-c534a53e7cf1',
  })
  statusId!: string;

  @ApiProperty({
    type: () => SwaggerTaskStatusDto,
  })
  status!: SwaggerTaskStatusDto;

  @ApiProperty({
    nullable: true,
    example: 2,
  })
  position!: number | null;

  @ApiProperty({
    nullable: true,
    example: 'user_2bdb3b8d-8a3d-4354-b18f-9497b9a6ec82',
  })
  assigneeId!: string | null;

  @ApiProperty({
    nullable: true,
    example: '2026-04-15',
    format: 'date',
  })
  dueDate!: string | null;

  @ApiProperty({
    example: '2026-04-03T09:15:23.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-04-03T09:16:45.000Z',
    format: 'date-time',
  })
  updatedAt!: string;
}

export class SwaggerProjectTaskStatusDto extends SwaggerTaskStatusDto {
  @ApiProperty({
    type: () => [SwaggerTaskResponseDto],
  })
  tasks!: SwaggerTaskResponseDto[];
}

export class SwaggerProjectTasksResponseDto {
  @ApiProperty({
    type: () => [SwaggerProjectTaskStatusDto],
  })
  statuses!: SwaggerProjectTaskStatusDto[];
}

export class SwaggerDeleteTaskResponseDto {
  @ApiProperty({
    example: 'Task deleted successfully',
  })
  message!: string;
}
