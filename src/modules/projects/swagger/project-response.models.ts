import {
  ProjectMemberRole,
  ProjectStatusColor,
  TaskLogEventType,
} from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { SwaggerProjectTaskStatusDto } from '../../tasks/swagger/task-response.models';
import {
  SwaggerTaskLogAssigneeValueDto,
  createTaskLogValueSchema,
} from '../../task-logs/swagger/task-log-response.models';

export class SwaggerProjectStatusSummaryDto {
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

  @ApiProperty({
    enum: ProjectStatusColor,
    example: ProjectStatusColor.BLUE,
  })
  color!: ProjectStatusColor;

  @ApiProperty({
    example: 3,
  })
  taskCount!: number;
}

export class SwaggerProjectStatusListResponseDto {
  @ApiProperty({
    type: () => [SwaggerProjectStatusSummaryDto],
  })
  items!: SwaggerProjectStatusSummaryDto[];
}

export class SwaggerProjectSummaryResponseDto {
  @ApiProperty({
    example: 'proj_7b0be4ef-8eb6-4db1-a442-c534a53e7cf1',
  })
  id!: string;

  @ApiProperty({
    example: 'Launch Website',
  })
  name!: string;

  @ApiProperty({
    nullable: true,
    example: 'Track launch tasks',
  })
  description!: string | null;

  @ApiProperty({
    enum: ProjectMemberRole,
    example: ProjectMemberRole.OWNER,
  })
  role!: ProjectMemberRole;

  @ApiProperty({
    type: () => [SwaggerProjectStatusSummaryDto],
  })
  statuses!: SwaggerProjectStatusSummaryDto[];
}

export class SwaggerProjectListResponseDto {
  @ApiProperty({
    type: () => [SwaggerProjectSummaryResponseDto],
  })
  items!: SwaggerProjectSummaryResponseDto[];
}

export class SwaggerProjectMemberResponseDto {
  @ApiProperty({
    example: 'user_2bdb3b8d-8a3d-4354-b18f-9497b9a6ec82',
  })
  id!: string;

  @ApiProperty({
    example: 'Jane Doe',
  })
  name!: string;

  @ApiProperty({
    enum: ProjectMemberRole,
    example: ProjectMemberRole.MEMBER,
  })
  role!: ProjectMemberRole;
}

export class SwaggerProjectDetailResponseDto {
  @ApiProperty({
    example: 'proj_7b0be4ef-8eb6-4db1-a442-c534a53e7cf1',
  })
  id!: string;

  @ApiProperty({
    example: 'Launch Website',
  })
  name!: string;

  @ApiProperty({
    nullable: true,
    example: 'Track launch tasks',
  })
  description!: string | null;

  @ApiProperty({
    type: () => [SwaggerProjectMemberResponseDto],
  })
  members!: SwaggerProjectMemberResponseDto[];

  @ApiProperty({
    type: () => [SwaggerProjectTaskStatusDto],
  })
  statuses!: SwaggerProjectTaskStatusDto[];
}

export class SwaggerDeleteProjectResponseDto {
  @ApiProperty({
    example: 'Project deleted successfully',
  })
  message!: string;
}

export class SwaggerProjectActivityActorDto {
  @ApiProperty({
    example: 'user_2bdb3b8d-8a3d-4354-b18f-9497b9a6ec82',
  })
  id!: string;

  @ApiProperty({
    example: 'Jane Doe',
  })
  name!: string;
}

export class SwaggerProjectActivityTaskDto {
  @ApiProperty({
    example: 'task_a8d2f20f-d10e-4041-a9b7-97c8c160db8d',
  })
  id!: string;

  @ApiProperty({
    example: 'Ship launch checklist',
  })
  title!: string;

  @ApiProperty({
    example: 'status_7b0be4ef-8eb6-4db1-a442-c534a53e7cf1',
  })
  statusId!: string;

  @ApiProperty({
    example: 'In Progress',
  })
  statusName!: string;

  @ApiProperty({
    example: false,
  })
  isClosed!: boolean;
}

export class SwaggerProjectActivityEntryResponseDto {
  @ApiProperty({
    example: 'log_8b2f8f3e-ff1f-46d6-a864-85f95da60f0f',
  })
  id!: string;

  @ApiProperty({
    enum: TaskLogEventType,
    example: TaskLogEventType.TASK_UPDATED,
  })
  eventType!: TaskLogEventType;

  @ApiProperty({
    nullable: true,
    example: 'assigneeId',
  })
  fieldName!: string | null;

  @ApiProperty(
    createTaskLogValueSchema('Previous value recorded for the activity event.'),
  )
  oldValue!: unknown;

  @ApiProperty(
    createTaskLogValueSchema('Next value recorded for the activity event.'),
  )
  newValue!: unknown;

  @ApiProperty({
    example: 'Jane Doe updated the assignee',
  })
  summary!: string;

  @ApiProperty({
    example: '2026-04-03T09:16:45.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    type: () => SwaggerProjectActivityActorDto,
  })
  actor!: SwaggerProjectActivityActorDto;

  @ApiProperty({
    type: () => SwaggerProjectActivityTaskDto,
  })
  task!: SwaggerProjectActivityTaskDto;
}

export class SwaggerProjectActivityResponseDto {
  @ApiProperty({
    type: () => [SwaggerProjectActivityEntryResponseDto],
  })
  items!: SwaggerProjectActivityEntryResponseDto[];

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

export const swaggerProjectActivityExtraModels = [
  SwaggerTaskLogAssigneeValueDto,
] as const;
