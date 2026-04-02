import {
  Prisma,
  ProjectMemberRole,
  TaskLogEventType,
  TaskStatus,
} from '@prisma/client';
import type { TaskLogValue } from '../../task-logs/types/task-log-response.type';

export type ProjectTaskCounts = Record<TaskStatus, number>;

export type ProjectSummaryResponse = {
  id: string;
  name: string;
  description: string | null;
  role: ProjectMemberRole;
  taskCounts: ProjectTaskCounts;
};

export type ProjectListResponse = {
  items: ProjectSummaryResponse[];
};

export type ProjectMemberResponse = {
  id: string;
  name: string;
  role: ProjectMemberRole;
};

export type ProjectTaskCardResponse = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  position: number | null;
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectTaskGroupsResponse = Record<
  TaskStatus,
  ProjectTaskCardResponse[]
>;

export type ProjectDetailResponse = {
  id: string;
  name: string;
  description: string | null;
  members: ProjectMemberResponse[];
  taskGroups: ProjectTaskGroupsResponse;
};

export type DeleteProjectResponse = {
  message: string;
};

export type ProjectActivityEntryResponse = {
  id: string;
  eventType: TaskLogEventType;
  fieldName: string | null;
  oldValue: TaskLogValue;
  newValue: TaskLogValue;
  summary: string;
  createdAt: string;
  actor: {
    id: string;
    name: string;
  };
  task: {
    id: string;
    title: string;
    status: TaskStatus;
  };
};

export type ProjectActivityResponse = {
  items: ProjectActivityEntryResponse[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type ProjectSummaryRecord = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  tasks: Array<{
    status: TaskStatus;
  }>;
};

export type ProjectDetailMemberRecord = {
  role: ProjectMemberRole;
  user: {
    id: string;
    name: string;
  };
};

export type ProjectDetailTaskRecord = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  position: number | null;
  assigneeId: string | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectTaskGroupsRecord = Record<
  TaskStatus,
  ProjectDetailTaskRecord[]
>;

export type ProjectDetailRecord = {
  id: string;
  name: string;
  description: string | null;
  members: ProjectDetailMemberRecord[];
  taskGroups: ProjectTaskGroupsRecord;
};

export type ProjectActivityRecord = {
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
  task: {
    id: string;
    title: string;
    status: TaskStatus;
  };
};
