import { Injectable } from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import {
  createNotFoundException,
  createValidationException,
} from '../../../common/utils/api-exception.util';
import { groupTaskRecordsByStatus } from '../../../common/utils/task-groups.util';
import { PrismaService } from '../../../database/prisma.service';
import type { AuthUserResponse } from '../../auth/types/auth-response.type';
import {
  TaskLogsService,
  type TaskLogFieldChange,
} from '../../task-logs/service/task-logs.service';
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
  constructor(
    private readonly prismaService: PrismaService,
    private readonly taskLogsService: TaskLogsService,
  ) {}

  async createTask(
    currentUser: AuthUserResponse,
    projectId: string,
    createTaskDto: CreateTaskDto,
  ): Promise<TaskResponse> {
    await this.assertValidAssignee(projectId, createTaskDto.assigneeId);

    return this.prismaService.$transaction(async (transactionClient) => {
      const createdTask = await transactionClient.task.create({
        data: {
          projectId,
          title: createTaskDto.title,
          description: createTaskDto.description ?? null,
          status: createTaskDto.status ?? TaskStatus.TODO,
          assigneeId: createTaskDto.assigneeId ?? null,
          dueDate: createTaskDto.dueDate
            ? new Date(createTaskDto.dueDate)
            : null,
          createdById: currentUser.id,
        },
        select: taskResponseSelect,
      });

      await this.taskLogsService.createTaskCreatedLog(transactionClient, {
        actorId: currentUser.id,
        actorName: currentUser.name,
        taskId: createdTask.id,
      });

      return mapTaskResponse(createdTask);
    });
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
      select: updateTaskComparisonSelect,
    });

    if (!existingTask) {
      throw this.createTaskNotFoundException();
    }

    await this.assertValidAssignee(
      existingTask.projectId,
      updateTaskDto.assigneeId,
    );

    try {
      return this.prismaService.$transaction(async (transactionClient) => {
        const changes = await this.buildTaskUpdateChanges(
          transactionClient,
          existingTask,
          updateTaskDto,
        );
        const updatedTask = await transactionClient.task.update({
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

        await this.taskLogsService.createTaskUpdatedLogs(transactionClient, {
          actorId: currentUser.id,
          actorName: currentUser.name,
          taskId: updatedTask.id,
          changes,
        });

        return mapTaskResponse(updatedTask);
      });
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
    const existingTask = await this.prismaService.task.findUnique({
      where: {
        id: taskId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existingTask) {
      throw this.createTaskNotFoundException();
    }

    try {
      return this.prismaService.$transaction(async (transactionClient) => {
        const updatedTask = await transactionClient.task.update({
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

        if (existingTask.status !== updateTaskStatusDto.status) {
          await this.taskLogsService.createStatusChangedLog(transactionClient, {
            actorId: currentUser.id,
            actorName: currentUser.name,
            taskId: updatedTask.id,
            previousStatus: existingTask.status,
            nextStatus: updateTaskStatusDto.status,
          });
        }

        return mapTaskResponse(updatedTask);
      });
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
      throw createValidationException({
        message: 'Request validation failed',
        details: {
          assigneeId: ['Assignee must be a member of the project'],
        },
      });
    }
  }

  private createTaskNotFoundException() {
    return createNotFoundException({
      message: 'Task not found',
    });
  }

  private async buildTaskUpdateChanges(
    transactionClient: Prisma.TransactionClient,
    existingTask: {
      title: string;
      description: string | null;
      assigneeId: string | null;
      dueDate: Date | null;
    },
    updateTaskDto: UpdateTaskDto,
  ): Promise<TaskLogFieldChange[]> {
    const changes: TaskLogFieldChange[] = [];

    if (
      updateTaskDto.title !== undefined &&
      updateTaskDto.title !== existingTask.title
    ) {
      changes.push({
        fieldName: 'title',
        oldValue: existingTask.title,
        newValue: updateTaskDto.title,
      });
    }

    if (
      updateTaskDto.description !== undefined &&
      updateTaskDto.description !== existingTask.description
    ) {
      changes.push({
        fieldName: 'description',
        oldValue: existingTask.description,
        newValue: updateTaskDto.description,
      });
    }

    if (
      updateTaskDto.dueDate !== undefined &&
      updateTaskDto.dueDate !== normalizeTaskDueDate(existingTask.dueDate)
    ) {
      changes.push({
        fieldName: 'dueDate',
        oldValue: normalizeTaskDueDate(existingTask.dueDate),
        newValue: updateTaskDto.dueDate,
      });
    }

    if (
      updateTaskDto.assigneeId !== undefined &&
      updateTaskDto.assigneeId !== existingTask.assigneeId
    ) {
      const [oldAssigneeValue, newAssigneeValue] = await Promise.all([
        this.taskLogsService.getAssigneeLogValue(
          transactionClient,
          existingTask.assigneeId,
        ),
        this.taskLogsService.getAssigneeLogValue(
          transactionClient,
          updateTaskDto.assigneeId ?? null,
        ),
      ]);

      changes.push({
        fieldName: 'assigneeId',
        oldValue: oldAssigneeValue,
        newValue: newAssigneeValue,
      });
    }

    return changes;
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

const updateTaskComparisonSelect = {
  projectId: true,
  title: true,
  description: true,
  assigneeId: true,
  dueDate: true,
} satisfies Prisma.TaskSelect;

function isPrismaRecordNotFoundError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2025'
  );
}

function normalizeTaskDueDate(dueDate: Date | null) {
  return dueDate ? dueDate.toISOString().slice(0, 10) : null;
}
