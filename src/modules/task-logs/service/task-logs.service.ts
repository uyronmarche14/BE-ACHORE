import { Injectable } from '@nestjs/common';
import { Prisma, TaskLogEventType } from '@prisma/client';
import { createNotFoundException } from '../../../common/utils/api-exception.util';
import { PrismaService } from '../../../database/prisma.service';
import { mapTaskLogsResponse } from '../mapper/task-logs.mapper';
import type {
  PaginatedTaskLogRecords,
  TaskLogAssigneeValue,
  TaskLogsResponse,
  TaskLogValue,
} from '../types/task-log-response.type';

type TaskLogClient = Prisma.TransactionClient | PrismaService;

type CreateTaskCreatedLogParams = {
  actorId: string;
  actorName: string;
  createdAt?: Date;
  taskId: string;
};

type CreateTaskUpdatedLogParams = {
  actorId: string;
  actorName: string;
  createdAt?: Date;
  taskId: string;
  changes: TaskLogFieldChange[];
};

type CreateStatusChangedLogParams = {
  actorId: string;
  actorName: string;
  createdAt?: Date;
  taskId: string;
  previousStatusName: string;
  nextStatusName: string;
};

export type TaskLogFieldChange = {
  fieldName:
    | 'title'
    | 'description'
    | 'acceptanceCriteria'
    | 'notes'
    | 'assigneeId'
    | 'dueDate'
    | 'links'
    | 'checklistItems';
  oldValue: TaskLogValue;
  newValue: TaskLogValue;
};

@Injectable()
export class TaskLogsService {
  constructor(private readonly prismaService: PrismaService) {}

  async listTaskLogs(
    taskId: string,
    options?: {
      page?: number;
      pageSize?: number;
    },
  ): Promise<TaskLogsResponse> {
    await this.assertTaskExists(taskId);

    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 10;
    const offset = (page - 1) * pageSize;
    const taskLogs = await this.prismaService.taskLog.findMany({
      where: {
        taskId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: offset,
      take: pageSize + 1,
      select: taskLogResponseSelect,
    });

    const paginatedTaskLogs: PaginatedTaskLogRecords = {
      items: taskLogs.slice(0, pageSize),
      page,
      pageSize,
      hasMore: taskLogs.length > pageSize,
    };

    return mapTaskLogsResponse(paginatedTaskLogs);
  }

  async createTaskCreatedLog(
    prismaClient: TaskLogClient,
    params: CreateTaskCreatedLogParams,
  ) {
    await prismaClient.taskLog.create({
      data: {
        taskId: params.taskId,
        actorId: params.actorId,
        eventType: TaskLogEventType.TASK_CREATED,
        fieldName: null,
        oldValue: Prisma.JsonNull,
        newValue: Prisma.JsonNull,
        summary: `${params.actorName} created the task`,
        ...(params.createdAt ? { createdAt: params.createdAt } : {}),
      },
    });
  }

  async createTaskUpdatedLogs(
    prismaClient: TaskLogClient,
    params: CreateTaskUpdatedLogParams,
  ) {
    if (params.changes.length === 0) {
      return;
    }

    await Promise.all(
      params.changes.map((change) =>
        prismaClient.taskLog.create({
          data: {
            taskId: params.taskId,
            actorId: params.actorId,
            eventType: TaskLogEventType.TASK_UPDATED,
            fieldName: change.fieldName,
            oldValue: toTaskLogJsonValue(change.oldValue),
            newValue: toTaskLogJsonValue(change.newValue),
            summary: `${params.actorName} updated the ${getTaskFieldLabel(
              change.fieldName,
            )}`,
            ...(params.createdAt ? { createdAt: params.createdAt } : {}),
          },
        }),
      ),
    );
  }

  async createStatusChangedLog(
    prismaClient: TaskLogClient,
    params: CreateStatusChangedLogParams,
  ) {
    if (params.previousStatusName === params.nextStatusName) {
      return;
    }

    await prismaClient.taskLog.create({
      data: {
        taskId: params.taskId,
        actorId: params.actorId,
        eventType: TaskLogEventType.STATUS_CHANGED,
        fieldName: 'status',
        oldValue: params.previousStatusName,
        newValue: params.nextStatusName,
        summary: `${params.actorName} moved the task from ${params.previousStatusName} to ${params.nextStatusName}`,
        ...(params.createdAt ? { createdAt: params.createdAt } : {}),
      },
    });
  }

  async getAssigneeLogValue(
    prismaClient: TaskLogClient,
    assigneeId: string | null,
  ): Promise<TaskLogAssigneeValue | null> {
    if (!assigneeId) {
      return null;
    }

    const user = await prismaClient.user.findUnique({
      where: {
        id: assigneeId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!user) {
      return {
        id: assigneeId,
        name: assigneeId,
      };
    }

    return {
      id: user.id,
      name: user.name,
    };
  }

  private async assertTaskExists(taskId: string) {
    const task = await this.prismaService.task.findUnique({
      where: {
        id: taskId,
      },
      select: {
        id: true,
      },
    });

    if (!task) {
      throw createNotFoundException({
        message: 'Task not found',
      });
    }
  }
}

const taskLogResponseSelect = {
  id: true,
  eventType: true,
  fieldName: true,
  oldValue: true,
  newValue: true,
  summary: true,
  createdAt: true,
  actor: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.TaskLogSelect;

function toTaskLogJsonValue(value: TaskLogValue) {
  return value === null ? Prisma.JsonNull : value;
}

function getTaskFieldLabel(fieldName: TaskLogFieldChange['fieldName']) {
  if (fieldName === 'assigneeId') {
    return 'assignee';
  }

  if (fieldName === 'dueDate') {
    return 'due date';
  }

  if (fieldName === 'acceptanceCriteria') {
    return 'acceptance criteria';
  }

  if (fieldName === 'checklistItems') {
    return 'checklist';
  }

  if (fieldName === 'links') {
    return 'links';
  }

  return fieldName;
}
