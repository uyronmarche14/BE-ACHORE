import type { Prisma } from '@prisma/client';
import type { TaskLogAssigneeValue } from '../../task-logs/types/task-log-response.type';

export type TaskAssignmentNotificationResponse = {
  id: string;
  type: 'task_assigned';
  createdAt: string;
  actor: {
    id: string;
    name: string;
  };
  project: {
    id: string;
    name: string;
  };
  task: {
    id: string;
    title: string;
  };
};

export type TaskAssignmentNotificationsResponse = {
  items: TaskAssignmentNotificationResponse[];
};

export type TaskAssignmentNotificationRecord = {
  id: string;
  createdAt: Date;
  actor: {
    id: string;
    name: string;
  };
  newValue: Prisma.JsonValue;
  task: {
    id: string;
    title: string;
    project: {
      id: string;
      name: string;
    };
  };
};

export type TaskAssignmentNotificationAssigneeValue =
  TaskLogAssigneeValue | null;
