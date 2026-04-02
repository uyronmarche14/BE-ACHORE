import type { Prisma, TaskLogEventType } from '@prisma/client';

export type TaskLogActorResponse = {
  id: string;
  name: string;
};

export type TaskLogAssigneeValue = {
  id: string;
  name: string;
};

export type TaskLogValue =
  | string
  | number
  | boolean
  | TaskLogAssigneeValue
  | null;

export type TaskLogEntryResponse = {
  id: string;
  eventType: TaskLogEventType;
  fieldName: string | null;
  oldValue: TaskLogValue;
  newValue: TaskLogValue;
  summary: string;
  actor: TaskLogActorResponse;
  createdAt: string;
};

export type TaskLogsResponse = {
  items: TaskLogEntryResponse[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type TaskLogRecord = {
  id: string;
  eventType: TaskLogEventType;
  fieldName: string | null;
  oldValue: Prisma.JsonValue;
  newValue: Prisma.JsonValue;
  summary: string;
  createdAt: Date;
  actor: {
    id: string;
    name: string;
  };
};

export type PaginatedTaskLogRecords = {
  items: TaskLogRecord[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};
