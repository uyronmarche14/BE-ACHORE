import { Prisma, ProjectMemberRole } from '@prisma/client';
import type {
  DeleteProjectResponse,
  ProjectActivityRecord,
  ProjectActivityResponse,
  ProjectDetailMemberRecord,
  ProjectDetailRecord,
  ProjectDetailResponse,
  ProjectListResponse,
  ProjectMemberResponse,
  ProjectSummaryRecord,
  ProjectSummaryResponse,
  ProjectTaskCardResponse,
  ProjectStatusSummaryResponse,
} from '../types/project-response.type';
import type { TaskLogValue } from '../../task-logs/types/task-log-response.type';

export function mapProjectSummaryResponse(
  project: ProjectSummaryRecord,
  currentUserId: string,
): ProjectSummaryResponse {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    role:
      project.ownerId === currentUserId
        ? ProjectMemberRole.OWNER
        : ProjectMemberRole.MEMBER,
    statuses: project.statuses
      .map((status) => mapProjectStatusSummaryResponse(status))
      .sort((left, right) => left.position - right.position),
  };
}

export function mapProjectListResponse(
  projects: ProjectSummaryRecord[],
  currentUserId: string,
): ProjectListResponse {
  return {
    items: projects.map((project) =>
      mapProjectSummaryResponse(project, currentUserId),
    ),
  };
}

export function mapProjectDetailResponse(
  project: ProjectDetailRecord,
): ProjectDetailResponse {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    members: project.members.map((member) => mapProjectMemberResponse(member)),
    statuses: project.statuses
      .map((status) => ({
        id: status.id,
        name: status.name,
        position: status.position,
        isClosed: status.isClosed,
        color: status.color,
        tasks: [...(status.tasks ?? [])]
          .sort(compareProjectTasksForBoard)
          .map((task) => mapProjectTaskCardResponse(task)),
      }))
      .sort((left, right) => left.position - right.position),
  };
}

export function mapDeleteProjectResponse(): DeleteProjectResponse {
  return {
    message: 'Project deleted successfully',
  };
}

export function mapProjectActivityResponse(input: {
  items: ProjectActivityRecord[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}): ProjectActivityResponse {
  return {
    items: input.items.map((entry) => ({
      id: entry.id,
      eventType: entry.eventType,
      fieldName: entry.fieldName,
      oldValue: normalizeTaskLogValue(entry.oldValue),
      newValue: normalizeTaskLogValue(entry.newValue),
      summary: entry.summary,
      createdAt: entry.createdAt.toISOString(),
      actor: entry.actor,
      task: {
        id: entry.task.id,
        title: entry.task.title,
        statusId: entry.task.statusId,
        statusName: entry.task.status.name,
        isClosed: entry.task.status.isClosed,
      },
    })),
    page: input.page,
    pageSize: input.pageSize,
    hasMore: input.hasMore,
  };
}

function mapProjectStatusSummaryResponse(
  status: ProjectSummaryRecord['statuses'][number],
): ProjectStatusSummaryResponse {
  return {
    id: status.id,
    name: status.name,
    position: status.position,
    isClosed: status.isClosed,
    color: status.color,
    taskCount: status.tasks.length,
  };
}

function mapProjectMemberResponse(
  member: ProjectDetailMemberRecord,
): ProjectMemberResponse {
  return {
    id: member.user.id,
    name: member.user.name,
    role: member.role,
  };
}

function mapProjectTaskCardResponse(
  task: ProjectDetailRecord['statuses'][number]['tasks'][number],
): ProjectTaskCardResponse {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    acceptanceCriteria: task.acceptanceCriteria,
    notes: task.notes,
    parentTaskId: task.parentTaskId,
    statusId: task.statusId,
    status: {
      id: task.status.id,
      name: task.status.name,
      position: task.status.position,
      isClosed: task.status.isClosed,
      color: task.status.color,
    },
    position: task.position,
    assigneeId: task.assigneeId,
    dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null,
    links: (task.links ?? []).map((link) => ({
      id: link.id,
      label: link.label,
      url: link.url,
      position: link.position,
    })),
    checklistItems: (task.checklistItems ?? []).map((item) => ({
      id: item.id,
      label: item.label,
      isCompleted: item.isCompleted,
      position: item.position,
    })),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

function compareProjectTasksForBoard(
  left: ProjectDetailRecord['statuses'][number]['tasks'][number],
  right: ProjectDetailRecord['statuses'][number]['tasks'][number],
) {
  if (left.position !== null && right.position !== null) {
    if (left.position !== right.position) {
      return left.position - right.position;
    }
  } else if (left.position !== null) {
    return -1;
  } else if (right.position !== null) {
    return 1;
  }

  return left.createdAt.getTime() - right.createdAt.getTime();
}

function normalizeTaskLogValue(value: unknown): TaskLogValue {
  if (value === null || value === Prisma.JsonNull) {
    return null;
  }

  return value as TaskLogValue;
}
