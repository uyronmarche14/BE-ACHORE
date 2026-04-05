import { Prisma } from '@prisma/client';
import { createNotFoundException } from '../../../common/utils/api-exception.util';
import type { PrismaService } from '../../../database/prisma.service';

export type TaskClient = Prisma.TransactionClient | PrismaService;

export type UpdateTaskComparisonRecord = {
  projectId: string;
  title: string;
  description: string | null;
  acceptanceCriteria: string | null;
  notes: string | null;
  assigneeId: string | null;
  dueDate: Date | null;
  links: Array<{
    label: string;
    url: string;
  }>;
  checklistItems: Array<{
    label: string;
    isCompleted: boolean;
  }>;
};

export const taskStatusSelect = {
  id: true,
  name: true,
  position: true,
  isClosed: true,
  color: true,
} satisfies Prisma.ProjectStatusSelect;

const taskSubtaskSelect = {
  id: true,
  title: true,
  description: true,
  statusId: true,
  status: {
    select: taskStatusSelect,
  },
  assigneeId: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TaskSelect;

export const taskResponseSelect = {
  id: true,
  projectId: true,
  title: true,
  description: true,
  acceptanceCriteria: true,
  notes: true,
  parentTaskId: true,
  statusId: true,
  status: {
    select: taskStatusSelect,
  },
  position: true,
  assigneeId: true,
  dueDate: true,
  links: {
    orderBy: {
      position: 'asc',
    },
    select: {
      id: true,
      label: true,
      url: true,
      position: true,
    },
  },
  checklistItems: {
    orderBy: {
      position: 'asc',
    },
    select: {
      id: true,
      label: true,
      isCompleted: true,
      position: true,
    },
  },
  subtasks: {
    orderBy: {
      createdAt: 'asc',
    },
    select: taskSubtaskSelect,
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TaskSelect;

export const projectTaskStatusSelect = {
  id: true,
  name: true,
  position: true,
  isClosed: true,
  color: true,
  tasks: {
    where: {
      parentTaskId: null,
    },
    select: taskResponseSelect,
  },
} satisfies Prisma.ProjectStatusSelect;

export const updateTaskComparisonSelect = {
  projectId: true,
  title: true,
  description: true,
  acceptanceCriteria: true,
  notes: true,
  assigneeId: true,
  dueDate: true,
  links: {
    orderBy: {
      position: 'asc',
    },
    select: {
      label: true,
      url: true,
    },
  },
  checklistItems: {
    orderBy: {
      position: 'asc',
    },
    select: {
      label: true,
      isCompleted: true,
    },
  },
} satisfies Prisma.TaskSelect;

export const taskStatusComparisonSelect = {
  id: true,
  projectId: true,
  statusId: true,
  status: {
    select: {
      name: true,
    },
  },
} satisfies Prisma.TaskSelect;

export function createTaskNotFoundException() {
  return createNotFoundException({
    message: 'Task not found',
  });
}

export function isPrismaRecordNotFoundError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2025'
  );
}

export function normalizeTaskDueDate(dueDate: Date | null) {
  return dueDate ? dueDate.toISOString().slice(0, 10) : null;
}

export function summarizeLinks(links: Array<{ label: string; url: string }>) {
  return links.length === 0 ? 'No links' : `${links.length} link(s)`;
}

export function summarizeInputLinks(
  links: Array<{
    label: string;
    url: string;
  }>,
) {
  return links.length === 0 ? 'No links' : `${links.length} link(s)`;
}

export function summarizeChecklist(
  checklistItems: Array<{ label: string; isCompleted: boolean }>,
) {
  if (checklistItems.length === 0) {
    return 'No checklist items';
  }

  const completedCount = checklistItems.filter(
    (item) => item.isCompleted,
  ).length;

  return `${completedCount}/${checklistItems.length} checklist item(s) complete`;
}

export function summarizeInputChecklist(
  checklistItems: Array<{ label: string; isCompleted?: boolean }>,
) {
  if (checklistItems.length === 0) {
    return 'No checklist items';
  }

  const completedCount = checklistItems.filter(
    (item) => item.isCompleted,
  ).length;

  return `${completedCount}/${checklistItems.length} checklist item(s) complete`;
}
