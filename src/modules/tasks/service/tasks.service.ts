import { Injectable } from '@nestjs/common';
import type { AuthUserResponse } from '../../auth/types/auth-response.type';
import type { CreateTaskDto } from '../dto/create-task.dto';
import type { UpdateTaskDto } from '../dto/update-task.dto';
import type { UpdateTaskStatusDto } from '../dto/update-task-status.dto';
import type {
  DeleteTaskResponse,
  ProjectTasksResponse,
  TaskResponse,
} from '../types/task-response.type';
import { TaskCommandsService } from './task-commands.service';
import { TaskQueriesService } from './task-queries.service';

@Injectable()
export class TasksService {
  constructor(
    private readonly taskQueriesService: TaskQueriesService,
    private readonly taskCommandsService: TaskCommandsService,
  ) {}

  createTask(
    currentUser: AuthUserResponse,
    projectId: string,
    createTaskDto: CreateTaskDto,
  ): Promise<TaskResponse> {
    return this.taskCommandsService.createTask(
      currentUser,
      projectId,
      createTaskDto,
    );
  }

  listProjectTasks(projectId: string): Promise<ProjectTasksResponse> {
    return this.taskQueriesService.listProjectTasks(projectId);
  }

  getTask(taskId: string): Promise<TaskResponse> {
    return this.taskQueriesService.getTask(taskId);
  }

  updateTask(
    currentUser: AuthUserResponse,
    taskId: string,
    updateTaskDto: UpdateTaskDto,
  ): Promise<TaskResponse> {
    return this.taskCommandsService.updateTask(
      currentUser,
      taskId,
      updateTaskDto,
    );
  }

  updateTaskStatus(
    currentUser: AuthUserResponse,
    taskId: string,
    updateTaskStatusDto: UpdateTaskStatusDto,
  ): Promise<TaskResponse> {
    return this.taskCommandsService.updateTaskStatus(
      currentUser,
      taskId,
      updateTaskStatusDto,
    );
  }

  deleteTask(taskId: string): Promise<DeleteTaskResponse> {
    return this.taskCommandsService.deleteTask(taskId);
  }
}
