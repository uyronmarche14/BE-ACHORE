import type { ProjectStatusColor } from '@prisma/client';

export type TaskLinkResponse = {
  id: string;
  label: string;
  url: string;
  position: number;
};

export type TaskChecklistItemResponse = {
  id: string;
  label: string;
  isCompleted: boolean;
  position: number;
};

export type TaskSubtaskResponse = {
  id: string;
  title: string;
  description: string | null;
  statusId: string;
  status: TaskStatusResponse;
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskStatusResponse = {
  id: string;
  name: string;
  position: number;
  isClosed: boolean;
  color: ProjectStatusColor;
};

export type TaskResponse = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  acceptanceCriteria: string | null;
  notes: string | null;
  parentTaskId: string | null;
  statusId: string;
  status: TaskStatusResponse;
  position: number | null;
  assigneeId: string | null;
  dueDate: string | null;
  links: TaskLinkResponse[];
  checklistItems: TaskChecklistItemResponse[];
  subtasks: TaskSubtaskResponse[];
  createdAt: string;
  updatedAt: string;
};

export type DeleteTaskResponse = {
  message: string;
};

export type TaskActionResponse = {
  message: string;
};

export type TaskCommentResponse = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
  };
};

export type TaskCommentsResponse = {
  items: TaskCommentResponse[];
};

export type TaskAttachmentResponse = {
  id: string;
  label: string | null;
  fileName: string;
  url: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
  };
};

export type TaskAttachmentsResponse = {
  items: TaskAttachmentResponse[];
};

export type ProjectTaskStatusResponse = TaskStatusResponse & {
  tasks: TaskResponse[];
};

export type ProjectTasksResponse = {
  statuses: ProjectTaskStatusResponse[];
};

export type TaskStatusRecord = {
  id: string;
  name: string;
  position: number;
  isClosed: boolean;
  color: ProjectStatusColor;
};

export type TaskLinkRecord = {
  id: string;
  label: string;
  url: string;
  position: number;
};

export type TaskChecklistItemRecord = {
  id: string;
  label: string;
  isCompleted: boolean;
  position: number;
};

export type TaskSubtaskRecord = {
  id: string;
  title: string;
  description: string | null;
  statusId: string;
  status: TaskStatusRecord;
  assigneeId: string | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TaskRecord = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  acceptanceCriteria: string | null;
  notes: string | null;
  parentTaskId: string | null;
  statusId: string;
  status: TaskStatusRecord;
  position: number | null;
  assigneeId: string | null;
  dueDate: Date | null;
  links: TaskLinkRecord[];
  checklistItems: TaskChecklistItemRecord[];
  subtasks: TaskSubtaskRecord[];
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectTaskStatusRecord = TaskStatusRecord & {
  tasks: TaskRecord[];
};

export type TaskCommentRecord = {
  id: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    name: string;
  };
  authorId?: string;
};

export type TaskAttachmentRecord = {
  id: string;
  label: string | null;
  fileName: string;
  url: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string;
  };
  createdById?: string;
};
