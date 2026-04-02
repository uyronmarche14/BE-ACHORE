import { Prisma } from '@prisma/client';
import type {
  TaskLogEntryResponse,
  TaskLogRecord,
  TaskLogValue,
  TaskLogsResponse,
} from '../types/task-log-response.type';

export function mapTaskLogEntryResponse(
  taskLog: TaskLogRecord,
): TaskLogEntryResponse {
  return {
    id: taskLog.id,
    eventType: taskLog.eventType,
    fieldName: taskLog.fieldName,
    oldValue: normalizeTaskLogValue(taskLog.oldValue),
    newValue: normalizeTaskLogValue(taskLog.newValue),
    summary: taskLog.summary,
    actor: {
      id: taskLog.actor.id,
      name: taskLog.actor.name,
    },
    createdAt: taskLog.createdAt.toISOString(),
  };
}

export function mapTaskLogsResponse(
  taskLogs: TaskLogRecord[],
): TaskLogsResponse {
  return {
    items: taskLogs.map((taskLog) => mapTaskLogEntryResponse(taskLog)),
  };
}

function normalizeTaskLogValue(value: unknown): TaskLogValue {
  if (value === null || value === Prisma.JsonNull) {
    return null;
  }

  return value as TaskLogValue;
}
