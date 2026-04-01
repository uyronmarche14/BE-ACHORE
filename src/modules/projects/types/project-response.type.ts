import { ProjectMemberRole, TaskStatus } from '@prisma/client';

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
