import {
  Prisma,
  ProjectMemberRole,
  ProjectStatusColor,
  TaskLogEventType,
} from '@prisma/client';
import type { TaskLogValue } from '../../task-logs/types/task-log-response.type';
import type {
  TaskChecklistItemResponse,
  TaskLinkResponse,
} from '../../tasks/types/task-response.type';

export type ProjectStatusSummaryResponse = {
  id: string;
  name: string;
  position: number;
  isClosed: boolean;
  color: ProjectStatusColor;
  taskCount: number;
};

export type ProjectSummaryResponse = {
  id: string;
  name: string;
  description: string | null;
  role: ProjectMemberRole;
  statuses: ProjectStatusSummaryResponse[];
};

export type ProjectListResponse = {
  items: ProjectSummaryResponse[];
};

export type ProjectStatusListResponse = {
  items: ProjectStatusSummaryResponse[];
};

export type ProjectMemberResponse = {
  id: string;
  name: string;
  role: ProjectMemberRole;
};

export type ProjectTaskStatusResponse = {
  id: string;
  name: string;
  position: number;
  isClosed: boolean;
  tasks: ProjectTaskCardResponse[];
};

export type ProjectTaskCardResponse = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  acceptanceCriteria: string | null;
  notes: string | null;
  parentTaskId: string | null;
  statusId: string;
  status: {
    id: string;
    name: string;
    position: number;
    isClosed: boolean;
    color: ProjectStatusColor;
  };
  position: number | null;
  assigneeId: string | null;
  dueDate: string | null;
  links: TaskLinkResponse[];
  checklistItems: TaskChecklistItemResponse[];
  createdAt: string;
  updatedAt: string;
};

export type ProjectDetailResponse = {
  id: string;
  name: string;
  description: string | null;
  members: ProjectMemberResponse[];
  statuses: ProjectTaskStatusResponse[];
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
    statusId: string;
    statusName: string;
    isClosed: boolean;
  };
};

export type ProjectActivityResponse = {
  items: ProjectActivityEntryResponse[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type ProjectSummaryStatusRecord = {
  id: string;
  name: string;
  position: number;
  isClosed: boolean;
  color: ProjectStatusColor;
  tasks: Array<{
    id: string;
  }>;
};

export type ProjectSummaryRecord = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  statuses: ProjectSummaryStatusRecord[];
};

export type ProjectDetailMemberRecord = {
  role: ProjectMemberRole;
  user: {
    id: string;
    name: string;
  };
};

export type ProjectDetailTaskStatusRecord = {
  id: string;
  name: string;
  position: number;
  isClosed: boolean;
  color: ProjectStatusColor;
  tasks: ProjectDetailTaskRecord[];
};

export type ProjectDetailTaskRecord = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  acceptanceCriteria: string | null;
  notes: string | null;
  parentTaskId: string | null;
  statusId: string;
  status: {
    id: string;
    name: string;
    position: number;
    isClosed: boolean;
    color: ProjectStatusColor;
  };
  position: number | null;
  assigneeId: string | null;
  dueDate: Date | null;
  links: TaskLinkResponse[];
  checklistItems: TaskChecklistItemResponse[];
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectDetailRecord = {
  id: string;
  name: string;
  description: string | null;
  members: ProjectDetailMemberRecord[];
  statuses: ProjectDetailTaskStatusRecord[];
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
    statusId: string;
    status: {
      name: string;
      isClosed: boolean;
    };
  };
};
