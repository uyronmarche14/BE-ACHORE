import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
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
import { TasksService } from '../service/tasks.service';
import type {
  DeleteTaskResponse,
  TaskResponse,
} from '../types/task-response.type';

@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('projects/:projectId/tasks')
  @UseGuards(JwtAuthGuard, ResourceAccessGuard)
  @RequireProjectAccess()
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
  getTask(@Param('taskId') taskId: string): Promise<TaskResponse> {
    return this.tasksService.getTask(taskId);
  }

  @Put('tasks/:taskId')
  @UseGuards(JwtAuthGuard, ResourceAccessGuard)
  @RequireTaskAccess()
  updateTask(
    @CurrentUser() currentUser: AuthUserResponse,
    @Param('taskId') taskId: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ): Promise<TaskResponse> {
    return this.tasksService.updateTask(currentUser, taskId, updateTaskDto);
  }

  @Delete('tasks/:taskId')
  @UseGuards(JwtAuthGuard, ResourceAccessGuard)
  @RequireTaskAccess()
  deleteTask(@Param('taskId') taskId: string): Promise<DeleteTaskResponse> {
    return this.tasksService.deleteTask(taskId);
  }
}
