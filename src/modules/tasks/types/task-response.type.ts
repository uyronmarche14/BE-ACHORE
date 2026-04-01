import { TaskStatus } from '@prisma/client';

export type TaskResponse = {
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

export type DeleteTaskResponse = {
  message: string;
};

export type TaskGroupsResponse = Record<TaskStatus, TaskResponse[]>;

export type ProjectTasksResponse = {
  taskGroups: TaskGroupsResponse;
};

export type TaskRecord = {
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

export type TaskGroupRecords = Record<TaskStatus, TaskRecord[]>;
