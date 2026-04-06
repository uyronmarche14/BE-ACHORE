import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopedResponse } from '../../../common/swagger/decorators/api-enveloped-response.decorator';
import {
  ApiProjectIdParam,
  ApiTaskIdParam,
} from '../../../common/swagger/decorators/api-parameter.decorators';
import { ApiStandardErrorResponses } from '../../../common/swagger/decorators/api-standard-error-responses.decorator';
import { SWAGGER_BEARER_AUTH_NAME } from '../../../common/swagger/swagger.constants';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import {
  RequireProjectAccess,
  RequireTaskAccess,
} from '../../auth/decorators/resource-access.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResourceAccessGuard } from '../../auth/guards/resource-access.guard';
import type { AuthUserResponse } from '../../auth/types/auth-response.type';
import { CreateTaskAttachmentDto } from '../dto/create-task-attachment.dto';
import { CreateTaskCommentDto } from '../dto/create-task-comment.dto';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskCommentDto } from '../dto/update-task-comment.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { UpdateTaskStatusDto } from '../dto/update-task-status.dto';
import { TaskAttachmentsService } from '../service/task-attachments.service';
import { TaskAssignmentNotificationsService } from '../service/task-assignment-notifications.service';
import { TaskCommentsService } from '../service/task-comments.service';
import { TasksService } from '../service/tasks.service';
import type {
  DeleteTaskResponse,
  ProjectTasksResponse,
  TaskActionResponse,
  TaskAttachmentResponse,
  TaskAttachmentsResponse,
  TaskCommentResponse,
  TaskCommentsResponse,
  TaskResponse,
} from '../types/task-response.type';
import type { TaskAssignmentNotificationsResponse } from '../types/task-notification-response.type';
import {
  SwaggerTaskActionResponseDto,
  SwaggerTaskAttachmentResponseDto,
  SwaggerTaskAttachmentsResponseDto,
  SwaggerTaskCommentResponseDto,
  SwaggerTaskCommentsResponseDto,
  SwaggerDeleteTaskResponseDto,
  SwaggerProjectTasksResponseDto,
  SwaggerTaskResponseDto,
} from '../swagger/task-response.models';
import { SwaggerTaskAssignmentNotificationsResponseDto } from '../swagger/task-notification-response.models';

@ApiTags('Tasks')
@ApiBearerAuth(SWAGGER_BEARER_AUTH_NAME)
@Controller()
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly taskAssignmentNotificationsService: TaskAssignmentNotificationsService,
    private readonly taskCommentsService: TaskCommentsService,
    private readonly taskAttachmentsService: TaskAttachmentsService,
  ) {}

  @Get('projects/:projectId/tasks')
  @UseGuards(JwtAuthGuard, ResourceAccessGuard)
  @RequireProjectAccess()
  @ApiOperation({
    summary: 'List tasks for a project grouped by status.',
  })
  @ApiProjectIdParam()
  @ApiEnvelopedResponse({
    description: 'Project tasks loaded successfully.',
    type: SwaggerProjectTasksResponseDto,
  })
  @ApiStandardErrorResponses([401, 403, 404])
  listProjectTasks(
    @Param('projectId') projectId: string,
  ): Promise<ProjectTasksResponse> {
    return this.tasksService.listProjectTasks(projectId);
  }

  @Post('projects/:projectId/tasks')
  @UseGuards(JwtAuthGuard, ResourceAccessGuard)
  @RequireProjectAccess()
  @ApiOperation({
    summary: 'Create a task inside a project.',
  })
  @ApiProjectIdParam()
  @ApiEnvelopedResponse({
    status: 201,
    description: 'Task created successfully.',
    type: SwaggerTaskResponseDto,
  })
  @ApiStandardErrorResponses([400, 401, 403, 404])
  createTask(
    @CurrentUser() currentUser: AuthUserResponse,
    @Param('projectId') projectId: string,
    @Body() createTaskDto: CreateTaskDto,
  ): Promise<TaskResponse> {
    return this.tasksService.createTask(currentUser, projectId, createTaskDto);
  }

  @Get('tasks/assigned-notifications')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'List recent task assignment notifications for the current user.',
  })
  @ApiEnvelopedResponse({
    description: 'Task assignment notifications loaded successfully.',
    type: SwaggerTaskAssignmentNotificationsResponseDto,
  })
  @ApiStandardErrorResponses([401])
  listAssignedTaskNotifications(
    @CurrentUser() currentUser: AuthUserResponse,
  ): Promise<TaskAssignmentNotificationsResponse> {
    return this.taskAssignmentNotificationsService.listAssignedTaskNotifications(
      currentUser,
    );
  }

  @Get('tasks/:taskId')
  @UseGuards(JwtAuthGuard, ResourceAccessGuard)
  @RequireTaskAccess()
  @ApiOperation({
    summary: 'Get a single task by id.',
  })
  @ApiTaskIdParam()
  @ApiEnvelopedResponse({
    description: 'Task loaded successfully.',
    type: SwaggerTaskResponseDto,
  })
  @ApiStandardErrorResponses([401, 403, 404])
  getTask(@Param('taskId') taskId: string): Promise<TaskResponse> {
    return this.tasksService.getTask(taskId);
  }

  @Put('tasks/:taskId')
  @UseGuards(JwtAuthGuard, ResourceAccessGuard)
  @RequireTaskAccess()
  @ApiOperation({
    summary: 'Update mutable task fields.',
  })
  @ApiTaskIdParam()
  @ApiEnvelopedResponse({
    description: 'Task updated successfully.',
    type: SwaggerTaskResponseDto,
  })
  @ApiStandardErrorResponses([400, 401, 403, 404])
  updateTask(
    @CurrentUser() currentUser: AuthUserResponse,
    @Param('taskId') taskId: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ): Promise<TaskResponse> {
    return this.tasksService.updateTask(currentUser, taskId, updateTaskDto);
  }

  @Patch('tasks/:taskId/status')
  @UseGuards(JwtAuthGuard, ResourceAccessGuard)
  @RequireTaskAccess()
  @ApiOperation({
    summary: 'Move a task to a different status column.',
  })
  @ApiTaskIdParam()
  @ApiEnvelopedResponse({
    description: 'Task status updated successfully.',
    type: SwaggerTaskResponseDto,
  })
  @ApiStandardErrorResponses([400, 401, 403, 404])
  updateTaskStatus(
    @CurrentUser() currentUser: AuthUserResponse,
    @Param('taskId') taskId: string,
    @Body() updateTaskStatusDto: UpdateTaskStatusDto,
  ): Promise<TaskResponse> {
    return this.tasksService.updateTaskStatus(
      currentUser,
      taskId,
      updateTaskStatusDto,
    );
  }

  @Get('tasks/:taskId/comments')
  @UseGuards(JwtAuthGuard, ResourceAccessGuard)
  @RequireTaskAccess()
  @ApiOperation({
    summary: 'List task comments.',
  })
  @ApiTaskIdParam()
  @ApiEnvelopedResponse({
    description: 'Task comments loaded successfully.',
    type: SwaggerTaskCommentsResponseDto,
  })
  @ApiStandardErrorResponses([401, 403, 404])
  listTaskComments(
    @Param('taskId') taskId: string,
  ): Promise<TaskCommentsResponse> {
    return this.taskCommentsService.listTaskComments(taskId);
  }

  @Post('tasks/:taskId/comments')
  @UseGuards(JwtAuthGuard, ResourceAccessGuard)
  @RequireTaskAccess()
  @ApiOperation({
    summary: 'Create a task comment.',
  })
  @ApiTaskIdParam()
  @ApiEnvelopedResponse({
    status: 201,
    description: 'Task comment created successfully.',
    type: SwaggerTaskCommentResponseDto,
  })
  @ApiStandardErrorResponses([400, 401, 403, 404])
  createTaskComment(
    @CurrentUser() currentUser: AuthUserResponse,
    @Param('taskId') taskId: string,
    @Body() createTaskCommentDto: CreateTaskCommentDto,
  ): Promise<TaskCommentResponse> {
    return this.taskCommentsService.createTaskComment(
      currentUser,
      taskId,
      createTaskCommentDto,
    );
  }

  @Patch('tasks/:taskId/comments/:commentId')
  @UseGuards(JwtAuthGuard, ResourceAccessGuard)
  @RequireTaskAccess()
  @ApiOperation({
    summary: 'Update a task comment.',
  })
  @ApiTaskIdParam()
  @ApiEnvelopedResponse({
    description: 'Task comment updated successfully.',
    type: SwaggerTaskCommentResponseDto,
  })
  @ApiStandardErrorResponses([400, 401, 403, 404])
  updateTaskComment(
    @CurrentUser() currentUser: AuthUserResponse,
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
    @Body() updateTaskCommentDto: UpdateTaskCommentDto,
  ): Promise<TaskCommentResponse> {
    return this.taskCommentsService.updateTaskComment(
      currentUser,
      taskId,
      commentId,
      updateTaskCommentDto,
    );
  }

  @Delete('tasks/:taskId/comments/:commentId')
  @UseGuards(JwtAuthGuard, ResourceAccessGuard)
  @RequireTaskAccess()
  @ApiOperation({
    summary: 'Delete a task comment.',
  })
  @ApiTaskIdParam()
  @ApiEnvelopedResponse({
    description: 'Task comment deleted successfully.',
    type: SwaggerTaskActionResponseDto,
  })
  @ApiStandardErrorResponses([401, 403, 404])
  deleteTaskComment(
    @CurrentUser() currentUser: AuthUserResponse,
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
  ): Promise<TaskActionResponse> {
    return this.taskCommentsService.deleteTaskComment(
      currentUser,
      taskId,
      commentId,
    );
  }

  @Get('tasks/:taskId/attachments')
  @UseGuards(JwtAuthGuard, ResourceAccessGuard)
  @RequireTaskAccess()
  @ApiOperation({
    summary: 'List task attachments.',
  })
  @ApiTaskIdParam()
  @ApiEnvelopedResponse({
    description: 'Task attachments loaded successfully.',
    type: SwaggerTaskAttachmentsResponseDto,
  })
  @ApiStandardErrorResponses([401, 403, 404])
  listTaskAttachments(
    @Param('taskId') taskId: string,
  ): Promise<TaskAttachmentsResponse> {
    return this.taskAttachmentsService.listTaskAttachments(taskId);
  }

  @Post('tasks/:taskId/attachments')
  @UseGuards(JwtAuthGuard, ResourceAccessGuard)
  @RequireTaskAccess()
  @ApiOperation({
    summary: 'Create a URL-backed task attachment.',
  })
  @ApiTaskIdParam()
  @ApiEnvelopedResponse({
    status: 201,
    description: 'Task attachment created successfully.',
    type: SwaggerTaskAttachmentResponseDto,
  })
  @ApiStandardErrorResponses([400, 401, 403, 404])
  createTaskAttachment(
    @CurrentUser() currentUser: AuthUserResponse,
    @Param('taskId') taskId: string,
    @Body() createTaskAttachmentDto: CreateTaskAttachmentDto,
  ): Promise<TaskAttachmentResponse> {
    return this.taskAttachmentsService.createTaskAttachment(
      currentUser,
      taskId,
      createTaskAttachmentDto,
    );
  }

  @Delete('tasks/:taskId/attachments/:attachmentId')
  @UseGuards(JwtAuthGuard, ResourceAccessGuard)
  @RequireTaskAccess()
  @ApiOperation({
    summary: 'Delete a task attachment.',
  })
  @ApiTaskIdParam()
  @ApiEnvelopedResponse({
    description: 'Task attachment deleted successfully.',
    type: SwaggerTaskActionResponseDto,
  })
  @ApiStandardErrorResponses([401, 403, 404])
  deleteTaskAttachment(
    @CurrentUser() currentUser: AuthUserResponse,
    @Param('taskId') taskId: string,
    @Param('attachmentId') attachmentId: string,
  ): Promise<TaskActionResponse> {
    return this.taskAttachmentsService.deleteTaskAttachment(
      currentUser,
      taskId,
      attachmentId,
    );
  }

  @Delete('tasks/:taskId')
  @UseGuards(JwtAuthGuard, ResourceAccessGuard)
  @RequireTaskAccess()
  @ApiOperation({
    summary: 'Delete a task.',
  })
  @ApiTaskIdParam()
  @ApiEnvelopedResponse({
    description: 'Task deleted successfully.',
    type: SwaggerDeleteTaskResponseDto,
  })
  @ApiStandardErrorResponses([401, 403, 404])
  deleteTask(@Param('taskId') taskId: string): Promise<DeleteTaskResponse> {
    return this.tasksService.deleteTask(taskId);
  }
}
