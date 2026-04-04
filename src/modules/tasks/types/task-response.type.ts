export type TaskStatusResponse = {
  id: string;
  name: string;
  position: number;
  isClosed: boolean;
};

export type TaskResponse = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  statusId: string;
  status: TaskStatusResponse;
  position: number | null;
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DeleteTaskResponse = {
  message: string;
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
};

export type TaskRecord = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  statusId: string;
  status: TaskStatusRecord;
  position: number | null;
  assigneeId: string | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectTaskStatusRecord = TaskStatusRecord & {
  tasks: TaskRecord[];
};
