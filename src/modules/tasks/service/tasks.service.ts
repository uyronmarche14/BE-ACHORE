import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { groupTaskRecordsByStatus } from '../../../common/utils/task-groups.util';
import { PrismaService } from '../../../database/prisma.service';
import type { AuthUserResponse } from '../../auth/types/auth-response.type';
import {
  mapDeleteTaskResponse,
  mapProjectTasksResponse,
  mapTaskResponse,
} from '../mapper/tasks.mapper';
import type { CreateTaskDto } from '../dto/create-task.dto';
import type { UpdateTaskDto } from '../dto/update-task.dto';
import type { UpdateTaskStatusDto } from '../dto/update-task-status.dto';
import type {
  DeleteTaskResponse,
  ProjectTasksResponse,
  TaskResponse,
} from '../types/task-response.type';

@Injectable()
export class TasksService {
  constructor(private readonly prismaService: PrismaService) {}

  async createTask(
    currentUser: AuthUserResponse,
    projectId: string,
    createTaskDto: CreateTaskDto,
  ): Promise<TaskResponse> {
    await this.assertValidAssignee(projectId, createTaskDto.assigneeId);

    const createdTask = await this.prismaService.task.create({
      data: {
        projectId,
        title: createTaskDto.title,
        description: createTaskDto.description ?? null,
        status: createTaskDto.status ?? TaskStatus.TODO,
        assigneeId: createTaskDto.assigneeId ?? null,
        dueDate: createTaskDto.dueDate ? new Date(createTaskDto.dueDate) : null,
        createdById: currentUser.id,
      },
      select: taskResponseSelect,
    });

    return mapTaskResponse(createdTask);
  }

  async listProjectTasks(projectId: string): Promise<ProjectTasksResponse> {
    const tasks = await this.prismaService.task.findMany({
      where: {
        projectId,
      },
      select: taskResponseSelect,
    });

    return mapProjectTasksResponse(groupTaskRecordsByStatus(tasks));
  }

  async getTask(taskId: string): Promise<TaskResponse> {
    const task = await this.prismaService.task.findUnique({
      where: {
        id: taskId,
      },
      select: taskResponseSelect,
    });

    if (!task) {
      throw this.createTaskNotFoundException();
    }

    return mapTaskResponse(task);
  }

  async updateTask(
    currentUser: AuthUserResponse,
    taskId: string,
    updateTaskDto: UpdateTaskDto,
  ): Promise<TaskResponse> {
    const existingTask = await this.prismaService.task.findUnique({
      where: {
        id: taskId,
      },
      select: {
        projectId: true,
      },
    });

    if (!existingTask) {
      throw this.createTaskNotFoundException();
    }

    await this.assertValidAssignee(
      existingTask.projectId,
      updateTaskDto.assigneeId,
    );

    try {
      const updatedTask = await this.prismaService.task.update({
        where: {
          id: taskId,
        },
        data: {
          ...(updateTaskDto.title !== undefined
            ? {
                title: updateTaskDto.title,
              }
            : {}),
          ...(updateTaskDto.description !== undefined
            ? {
                description: updateTaskDto.description,
              }
            : {}),
          ...(updateTaskDto.assigneeId !== undefined
            ? {
                assigneeId: updateTaskDto.assigneeId,
              }
            : {}),
          ...(updateTaskDto.dueDate !== undefined
            ? {
                dueDate: updateTaskDto.dueDate
                  ? new Date(updateTaskDto.dueDate)
                  : null,
              }
            : {}),
          updatedById: currentUser.id,
        },
        select: taskResponseSelect,
      });

      return mapTaskResponse(updatedTask);
    } catch (error) {
      if (isPrismaRecordNotFoundError(error)) {
        throw this.createTaskNotFoundException();
      }

      throw error;
    }
  }

  async updateTaskStatus(
    currentUser: AuthUserResponse,
    taskId: string,
    updateTaskStatusDto: UpdateTaskStatusDto,
  ): Promise<TaskResponse> {
    try {
      const updatedTask = await this.prismaService.task.update({
        where: {
          id: taskId,
        },
        data: {
          status: updateTaskStatusDto.status,
          position: updateTaskStatusDto.position ?? null,
          updatedById: currentUser.id,
        },
        select: taskResponseSelect,
      });

      return mapTaskResponse(updatedTask);
    } catch (error) {
      if (isPrismaRecordNotFoundError(error)) {
        throw this.createTaskNotFoundException();
      }

      throw error;
    }
  }

  async deleteTask(taskId: string): Promise<DeleteTaskResponse> {
    try {
      await this.prismaService.task.delete({
        where: {
          id: taskId,
        },
      });
    } catch (error) {
      if (isPrismaRecordNotFoundError(error)) {
        throw this.createTaskNotFoundException();
      }

      throw error;
    }

    return mapDeleteTaskResponse();
  }

  private async assertValidAssignee(
    projectId: string,
    assigneeId?: string | null,
  ) {
    if (assigneeId === undefined || assigneeId === null) {
      return;
    }

    const membership = await this.prismaService.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: assigneeId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!membership) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: {
          assigneeId: ['Assignee must be a member of the project'],
        },
      });
    }
  }

  private createTaskNotFoundException() {
    return new NotFoundException({
      code: 'NOT_FOUND',
      message: 'Task not found',
      details: null,
    });
  }
}

const taskResponseSelect = {
  id: true,
  projectId: true,
  title: true,
  description: true,
  status: true,
  position: true,
  assigneeId: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
} satisfies Record<string, unknown>;

function isPrismaRecordNotFoundError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2025'
  );
}
