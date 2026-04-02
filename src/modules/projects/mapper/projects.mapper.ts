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
  ProjectTaskCounts,
  ProjectTaskGroupsRecord,
  ProjectTaskGroupsResponse,
  ProjectDetailTaskRecord,
} from '../types/project-response.type';
import type { TaskLogValue } from '../../task-logs/types/task-log-response.type';

export function mapProjectSummaryResponse(
  project: ProjectSummaryRecord,
  currentUserId: string,
): ProjectSummaryResponse {
  const taskCounts = createEmptyProjectTaskCounts();

  for (const task of project.tasks) {
    taskCounts[task.status] += 1;
  }

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    role:
      project.ownerId === currentUserId
        ? ProjectMemberRole.OWNER
        : ProjectMemberRole.MEMBER,
    taskCounts,
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
  const taskGroups = createEmptyProjectTaskGroups();

  for (const status of PROJECT_TASK_STATUSES) {
    taskGroups[status] = project.taskGroups[status].map((task) =>
      mapProjectTaskCardResponse(task),
    );
  }

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    members: project.members.map((member) => mapProjectMemberResponse(member)),
    taskGroups,
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
        status: entry.task.status,
      },
    })),
    page: input.page,
    pageSize: input.pageSize,
    hasMore: input.hasMore,
  };
}

export function createEmptyProjectTaskCounts(): ProjectTaskCounts {
  return {
    TODO: 0,
    IN_PROGRESS: 0,
    DONE: 0,
  };
}

export function createEmptyProjectTaskGroups(): ProjectTaskGroupsResponse {
  return {
    TODO: [],
    IN_PROGRESS: [],
    DONE: [],
  };
}

export function createEmptyProjectTaskGroupRecords(): ProjectTaskGroupsRecord {
  return {
    TODO: [],
    IN_PROGRESS: [],
    DONE: [],
  };
}

const PROJECT_TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;

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
  task: ProjectDetailTaskRecord,
): ProjectTaskCardResponse {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    status: task.status,
    position: task.position,
    assigneeId: task.assigneeId,
    dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

function normalizeTaskLogValue(value: unknown): TaskLogValue {
  if (value === null || value === Prisma.JsonNull) {
    return null;
  }

  return value as TaskLogValue;
}
