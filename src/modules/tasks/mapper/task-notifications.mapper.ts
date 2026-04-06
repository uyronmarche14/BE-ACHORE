import type {
  TaskAssignmentNotificationResponse,
  TaskAssignmentNotificationsResponse,
} from '../types/task-notification-response.type';

export function mapTaskAssignmentNotification(input: {
  id: string;
  createdAt: Date;
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
}): TaskAssignmentNotificationResponse {
  return {
    id: input.id,
    type: 'task_assigned',
    createdAt: input.createdAt.toISOString(),
    actor: input.actor,
    project: input.project,
    task: input.task,
  };
}

export function mapTaskAssignmentNotificationsResponse(input: {
  items: TaskAssignmentNotificationResponse[];
}): TaskAssignmentNotificationsResponse {
  return {
    items: input.items,
  };
}
