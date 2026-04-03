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
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { UpdateTaskStatusDto } from '../dto/update-task-status.dto';
import { TasksService } from '../service/tasks.service';
import type {
  DeleteTaskResponse,
  ProjectTasksResponse,
  TaskResponse,
} from '../types/task-response.type';
import {
  SwaggerDeleteTaskResponseDto,
  SwaggerProjectTasksResponseDto,
  SwaggerTaskResponseDto,
} from '../swagger/task-response.models';

@ApiTags('Tasks')
@ApiBearerAuth(SWAGGER_BEARER_AUTH_NAME)
@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

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
