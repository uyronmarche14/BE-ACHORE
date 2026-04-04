import { ProjectStatusColor } from '@prisma/client';
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

  @ApiProperty({
    enum: ProjectStatusColor,
    example: ProjectStatusColor.BLUE,
  })
  color!: ProjectStatusColor;
}

export class SwaggerTaskLinkDto {
  @ApiProperty({
    example: 'Product brief',
  })
  label!: string;

  @ApiProperty({
    example: 'https://example.com/brief',
  })
  url!: string;

  @ApiProperty({
    example: 1,
  })
  position!: number;

  @ApiProperty({
    example: 'link_a8d2f20f-d10e-4041-a9b7-97c8c160db8d',
  })
  id!: string;
}

export class SwaggerTaskChecklistItemDto {
  @ApiProperty({
    example: 'Confirm launch copy',
  })
  label!: string;

  @ApiProperty({
    example: false,
  })
  isCompleted!: boolean;

  @ApiProperty({
    example: 1,
  })
  position!: number;

  @ApiProperty({
    example: 'check_8d2f20f-d10e-4041-a9b7-97c8c160db8d',
  })
  id!: string;
}

export class SwaggerTaskSubtaskDto {
  @ApiProperty({
    example: 'task_a8d2f20f-d10e-4041-a9b7-97c8c160db8d',
  })
  id!: string;

  @ApiProperty({
    example: 'Confirm press kit assets',
  })
  title!: string;

  @ApiProperty({
    nullable: true,
    example: 'Need final logo and screenshots',
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
    nullable: true,
    example: '- QA sign-off\n- Design sign-off',
  })
  acceptanceCriteria!: string | null;

  @ApiProperty({
    nullable: true,
    example: 'Keep comms aligned with product launch notes.',
  })
  notes!: string | null;

  @ApiProperty({
    nullable: true,
    example: 'task_parent_7b0be4ef-8eb6-4db1-a442-c534a53e7cf1',
  })
  parentTaskId!: string | null;

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
    type: () => [SwaggerTaskLinkDto],
  })
  links!: SwaggerTaskLinkDto[];

  @ApiProperty({
    type: () => [SwaggerTaskChecklistItemDto],
  })
  checklistItems!: SwaggerTaskChecklistItemDto[];

  @ApiProperty({
    type: () => [SwaggerTaskSubtaskDto],
  })
  subtasks!: SwaggerTaskSubtaskDto[];

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

export class SwaggerTaskCommentAuthorDto {
  @ApiProperty({
    example: 'user_2bdb3b8d-8a3d-4354-b18f-9497b9a6ec82',
  })
  id!: string;

  @ApiProperty({
    example: 'Jane Doe',
  })
  name!: string;
}

export class SwaggerTaskCommentResponseDto {
  @ApiProperty({
    example: 'comment_2bdb3b8d-8a3d-4354-b18f-9497b9a6ec82',
  })
  id!: string;

  @ApiProperty({
    example:
      'We should keep the launch FAQ aligned with the final release notes.',
  })
  body!: string;

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

  @ApiProperty({
    type: () => SwaggerTaskCommentAuthorDto,
  })
  author!: SwaggerTaskCommentAuthorDto;
}

export class SwaggerTaskCommentsResponseDto {
  @ApiProperty({
    type: () => [SwaggerTaskCommentResponseDto],
  })
  items!: SwaggerTaskCommentResponseDto[];
}

export class SwaggerTaskAttachmentCreatedByDto {
  @ApiProperty({
    example: 'user_2bdb3b8d-8a3d-4354-b18f-9497b9a6ec82',
  })
  id!: string;

  @ApiProperty({
    example: 'Jane Doe',
  })
  name!: string;
}

export class SwaggerTaskAttachmentResponseDto {
  @ApiProperty({
    example: 'attachment_2bdb3b8d-8a3d-4354-b18f-9497b9a6ec82',
  })
  id!: string;

  @ApiProperty({
    nullable: true,
    example: 'Launch brief',
  })
  label!: string | null;

  @ApiProperty({
    example: 'launch-brief.pdf',
  })
  fileName!: string;

  @ApiProperty({
    example: 'https://example.com/files/launch-brief.pdf',
  })
  url!: string;

  @ApiProperty({
    nullable: true,
    example: 'application/pdf',
  })
  mimeType!: string | null;

  @ApiProperty({
    nullable: true,
    example: 128493,
  })
  sizeBytes!: number | null;

  @ApiProperty({
    example: '2026-04-03T09:15:23.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    type: () => SwaggerTaskAttachmentCreatedByDto,
  })
  createdBy!: SwaggerTaskAttachmentCreatedByDto;
}

export class SwaggerTaskAttachmentsResponseDto {
  @ApiProperty({
    type: () => [SwaggerTaskAttachmentResponseDto],
  })
  items!: SwaggerTaskAttachmentResponseDto[];
}

export class SwaggerTaskActionResponseDto {
  @ApiProperty({
    example: 'Task comment deleted successfully',
  })
  message!: string;
}
