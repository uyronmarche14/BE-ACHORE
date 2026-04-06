import { Injectable } from '@nestjs/common';
import { Prisma, TaskLogEventType } from '@prisma/client';
import type { AuthUserResponse } from '../../auth/types/auth-response.type';
import {
  mapTaskAssignmentNotification,
  mapTaskAssignmentNotificationsResponse,
} from '../mapper/task-notifications.mapper';
import type {
  TaskAssignmentNotificationAssigneeValue,
  TaskAssignmentNotificationsResponse,
  TaskAssignmentNotificationRecord,
} from '../types/task-notification-response.type';
import { PrismaService } from '../../../database/prisma.service';

const taskAssignmentNotificationSelect = {
  id: true,
  createdAt: true,
  newValue: true,
  actor: {
    select: {
      id: true,
      name: true,
    },
  },
  task: {
    select: {
      id: true,
      title: true,
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.TaskLogSelect;

@Injectable()
export class TaskAssignmentNotificationsService {
  constructor(private readonly prismaService: PrismaService) {}

  async listAssignedTaskNotifications(
    currentUser: AuthUserResponse,
  ): Promise<TaskAssignmentNotificationsResponse> {
    const taskLogs = await this.prismaService.taskLog.findMany({
      where: {
        actorId: {
          not: currentUser.id,
        },
        eventType: TaskLogEventType.TASK_UPDATED,
        fieldName: 'assigneeId',
        task: {
          assigneeId: currentUser.id,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 25,
      select: taskAssignmentNotificationSelect,
    });

    const seenTaskIds = new Set<string>();
    const items = taskLogs.flatMap((taskLog) => {
      const assigneeValue = getTaskAssignmentAssigneeValue(taskLog.newValue);

      if (!assigneeValue || assigneeValue.id !== currentUser.id) {
        return [];
      }

      if (seenTaskIds.has(taskLog.task.id)) {
        return [];
      }

      seenTaskIds.add(taskLog.task.id);

      return [
        mapTaskAssignmentNotification({
          id: taskLog.id,
          createdAt: taskLog.createdAt,
          actor: taskLog.actor,
          project: taskLog.task.project,
          task: {
            id: taskLog.task.id,
            title: taskLog.task.title,
          },
        }),
      ];
    });

    return mapTaskAssignmentNotificationsResponse({
      items,
    });
  }
}

function getTaskAssignmentAssigneeValue(
  value: TaskAssignmentNotificationRecord['newValue'],
): TaskAssignmentNotificationAssigneeValue {
  return isTaskAssignmentAssigneeValue(value) ? value : null;
}

function isTaskAssignmentAssigneeValue(
  value: TaskAssignmentNotificationRecord['newValue'],
): value is NonNullable<TaskAssignmentNotificationAssigneeValue> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    typeof value.id === 'string' &&
    typeof value.name === 'string'
  );
}
