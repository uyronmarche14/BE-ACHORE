import { Injectable } from '@nestjs/common';
import { Prisma, TaskLogEventType, TaskStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { mapTaskLogsResponse } from '../mapper/task-logs.mapper';
import type {
  TaskLogAssigneeValue,
  TaskLogsResponse,
  TaskLogValue,
} from '../types/task-log-response.type';

type TaskLogClient = Prisma.TransactionClient | PrismaService;

type CreateTaskCreatedLogParams = {
  actorId: string;
  actorName: string;
  taskId: string;
};

type CreateTaskUpdatedLogParams = {
  actorId: string;
  actorName: string;
  taskId: string;
  changes: TaskLogFieldChange[];
};

type CreateStatusChangedLogParams = {
  actorId: string;
  actorName: string;
  taskId: string;
  previousStatus: TaskStatus;
  nextStatus: TaskStatus;
};

export type TaskLogFieldChange = {
  fieldName: 'title' | 'description' | 'assigneeId' | 'dueDate';
  oldValue: TaskLogValue;
  newValue: TaskLogValue;
};

@Injectable()
export class TaskLogsService {
  constructor(private readonly prismaService: PrismaService) {}

  async listTaskLogs(taskId: string): Promise<TaskLogsResponse> {
    const taskLogs = await this.prismaService.taskLog.findMany({
      where: {
        taskId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: taskLogResponseSelect,
    });

    return mapTaskLogsResponse(taskLogs);
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
          },
        }),
      ),
    );
  }

  async createStatusChangedLog(
    prismaClient: TaskLogClient,
    params: CreateStatusChangedLogParams,
  ) {
    if (params.previousStatus === params.nextStatus) {
      return;
    }

    await prismaClient.taskLog.create({
      data: {
        taskId: params.taskId,
        actorId: params.actorId,
        eventType: TaskLogEventType.STATUS_CHANGED,
        fieldName: 'status',
        oldValue: params.previousStatus,
        newValue: params.nextStatus,
        summary: `${params.actorName} moved the task from ${formatTaskStatusLabel(
          params.previousStatus,
        )} to ${formatTaskStatusLabel(params.nextStatus)}`,
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

  return fieldName;
}

function formatTaskStatusLabel(status: TaskStatus) {
  if (status === TaskStatus.IN_PROGRESS) {
    return 'In progress';
  }

  if (status === TaskStatus.DONE) {
    return 'Done';
  }

  return 'Todo';
}
