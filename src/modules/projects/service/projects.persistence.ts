import { Prisma, ProjectMemberRole } from '@prisma/client';
import { createNotFoundException } from '../../../common/utils/api-exception.util';
import type { ProjectDetailMemberRecord } from '../types/project-response.type';

export const projectSummarySelect = {
  id: true,
  name: true,
  description: true,
  ownerId: true,
  statuses: {
    orderBy: {
      position: 'asc',
    },
    select: {
      id: true,
      name: true,
      position: true,
      isClosed: true,
      color: true,
      tasks: {
        where: {
          parentTaskId: null,
        },
        select: {
          id: true,
        },
      },
    },
  },
} satisfies Prisma.ProjectSelect;

const projectDetailTaskSelect = {
  id: true,
  projectId: true,
  title: true,
  description: true,
  acceptanceCriteria: true,
  notes: true,
  parentTaskId: true,
  statusId: true,
  status: {
    select: {
      id: true,
      name: true,
      position: true,
      isClosed: true,
      color: true,
    },
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
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TaskSelect;

export const projectDetailSelect = {
  id: true,
  name: true,
  description: true,
  members: {
    select: {
      role: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  statuses: {
    orderBy: {
      position: 'asc',
    },
    select: {
      id: true,
      name: true,
      position: true,
      isClosed: true,
      color: true,
      tasks: {
        where: {
          parentTaskId: null,
        },
        select: projectDetailTaskSelect,
      },
    },
  },
} satisfies Prisma.ProjectSelect;

export const projectStatusSummarySelect = {
  id: true,
  name: true,
  position: true,
  isClosed: true,
  color: true,
  tasks: {
    where: {
      parentTaskId: null,
    },
    select: {
      id: true,
    },
  },
} satisfies Prisma.ProjectStatusSelect;

export const projectActivitySelect = {
  id: true,
  eventType: true,
  fieldName: true,
  oldValue: true,
  newValue: true,
  summary: true,
  createdAt: true,
  actor: {
    select: {
      id: true,
      name: true,
    },
  },
  task: {
    select: {
      id: true,
      title: true,
      statusId: true,
      status: {
        select: {
          name: true,
          isClosed: true,
        },
      },
    },
  },
} satisfies Prisma.TaskLogSelect;

export function compareProjectMembers(
  left: ProjectDetailMemberRecord,
  right: ProjectDetailMemberRecord,
) {
  if (left.role !== right.role) {
    return left.role === ProjectMemberRole.OWNER ? -1 : 1;
  }

  return left.user.name.localeCompare(right.user.name);
}

export function createProjectNotFoundException() {
  return createNotFoundException({
    message: 'Project not found',
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

export function isPrismaUniqueConstraintError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}
