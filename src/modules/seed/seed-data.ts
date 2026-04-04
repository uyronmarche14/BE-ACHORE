import { AppRole, ProjectMemberRole } from '@prisma/client';

export const DEMO_PASSWORD = 'DemoPass123!';

export const DEMO_USERS = {
  admin: {
    id: 'demo-admin',
    name: 'Demo Admin',
    email: 'demo.admin@example.com',
    role: AppRole.ADMIN,
    emailVerifiedAt: new Date('2026-04-01T08:00:00.000Z'),
    createdAt: new Date('2026-04-01T08:00:00.000Z'),
    updatedAt: new Date('2026-04-01T08:00:00.000Z'),
  },
  member: {
    id: 'demo-member',
    name: 'Demo Member',
    email: 'demo.member@example.com',
    role: AppRole.MEMBER,
    emailVerifiedAt: new Date('2026-04-01T08:05:00.000Z'),
    createdAt: new Date('2026-04-01T08:05:00.000Z'),
    updatedAt: new Date('2026-04-01T08:05:00.000Z'),
  },
} as const;

export const DEMO_PROJECTS = {
  primary: {
    id: 'demo-project-board',
    name: 'Demo Launch Readiness',
    description:
      'Reviewer-ready board covering auth, drag-and-drop, logs, and delivery polish.',
    ownerId: DEMO_USERS.member.id,
    createdAt: new Date('2026-04-01T09:00:00.000Z'),
    updatedAt: new Date('2026-04-04T12:00:00.000Z'),
  },
  secondary: {
    id: 'demo-project-ops',
    name: 'Demo Operations Follow-up',
    description:
      'Secondary seeded workspace that makes dashboard navigation and counts feel real.',
    ownerId: DEMO_USERS.admin.id,
    createdAt: new Date('2026-04-01T09:10:00.000Z'),
    updatedAt: new Date('2026-04-03T15:00:00.000Z'),
  },
} as const;

export const DEMO_PROJECT_STATUSES = {
  primaryTodo: {
    id: 'demo-status-primary-todo',
    projectId: DEMO_PROJECTS.primary.id,
    name: 'Todo',
    position: 1,
    isClosed: false,
    createdAt: new Date('2026-04-01T09:00:00.000Z'),
    updatedAt: new Date('2026-04-01T09:00:00.000Z'),
  },
  primaryInProgress: {
    id: 'demo-status-primary-in-progress',
    projectId: DEMO_PROJECTS.primary.id,
    name: 'In Progress',
    position: 2,
    isClosed: false,
    createdAt: new Date('2026-04-01T09:00:00.000Z'),
    updatedAt: new Date('2026-04-01T09:00:00.000Z'),
  },
  primaryDone: {
    id: 'demo-status-primary-done',
    projectId: DEMO_PROJECTS.primary.id,
    name: 'Done',
    position: 3,
    isClosed: true,
    createdAt: new Date('2026-04-01T09:00:00.000Z'),
    updatedAt: new Date('2026-04-01T09:00:00.000Z'),
  },
  secondaryTodo: {
    id: 'demo-status-secondary-todo',
    projectId: DEMO_PROJECTS.secondary.id,
    name: 'Todo',
    position: 1,
    isClosed: false,
    createdAt: new Date('2026-04-01T09:10:00.000Z'),
    updatedAt: new Date('2026-04-01T09:10:00.000Z'),
  },
  secondaryInProgress: {
    id: 'demo-status-secondary-in-progress',
    projectId: DEMO_PROJECTS.secondary.id,
    name: 'In Progress',
    position: 2,
    isClosed: false,
    createdAt: new Date('2026-04-01T09:10:00.000Z'),
    updatedAt: new Date('2026-04-01T09:10:00.000Z'),
  },
  secondaryDone: {
    id: 'demo-status-secondary-done',
    projectId: DEMO_PROJECTS.secondary.id,
    name: 'Done',
    position: 3,
    isClosed: true,
    createdAt: new Date('2026-04-01T09:10:00.000Z'),
    updatedAt: new Date('2026-04-01T09:10:00.000Z'),
  },
} as const;

export const DEMO_PROJECT_MEMBERSHIPS = [
  {
    id: 'demo-membership-primary-owner',
    projectId: DEMO_PROJECTS.primary.id,
    userId: DEMO_USERS.member.id,
    role: ProjectMemberRole.OWNER,
    createdAt: new Date('2026-04-01T09:00:00.000Z'),
  },
  {
    id: 'demo-membership-secondary-owner',
    projectId: DEMO_PROJECTS.secondary.id,
    userId: DEMO_USERS.admin.id,
    role: ProjectMemberRole.OWNER,
    createdAt: new Date('2026-04-01T09:10:00.000Z'),
  },
  {
    id: 'demo-membership-secondary-member',
    projectId: DEMO_PROJECTS.secondary.id,
    userId: DEMO_USERS.member.id,
    role: ProjectMemberRole.MEMBER,
    createdAt: new Date('2026-04-01T09:12:00.000Z'),
  },
] as const;

export const DEMO_TASKS = [
  {
    id: 'demo-task-checklist',
    projectId: DEMO_PROJECTS.primary.id,
    title: 'Capture deployment checklist',
    description: 'List rollback, environment, and smoke-test steps for review.',
    statusId: DEMO_PROJECT_STATUSES.primaryTodo.id,
    position: 1,
    assigneeId: null,
    dueDate: new Date('2026-04-10T00:00:00.000Z'),
    createdById: DEMO_USERS.member.id,
    updatedById: null,
    createdAt: new Date('2026-04-01T09:15:00.000Z'),
    updatedAt: new Date('2026-04-01T09:15:00.000Z'),
  },
  {
    id: 'demo-task-walkthrough',
    projectId: DEMO_PROJECTS.primary.id,
    title: 'Rehearse reviewer walkthrough',
    description:
      'Keep the live assessment flow steady during the product demo.',
    statusId: DEMO_PROJECT_STATUSES.primaryInProgress.id,
    position: 1,
    assigneeId: DEMO_USERS.member.id,
    dueDate: new Date('2026-04-08T00:00:00.000Z'),
    createdById: DEMO_USERS.member.id,
    updatedById: DEMO_USERS.member.id,
    createdAt: new Date('2026-04-01T10:00:00.000Z'),
    updatedAt: new Date('2026-04-03T11:30:00.000Z'),
  },
  {
    id: 'demo-task-narrative',
    projectId: DEMO_PROJECTS.primary.id,
    title: 'Finalize demo board narrative',
    description: 'Board, logs, and auth are ready for review.',
    statusId: DEMO_PROJECT_STATUSES.primaryDone.id,
    position: 1,
    assigneeId: DEMO_USERS.member.id,
    dueDate: new Date('2026-04-06T00:00:00.000Z'),
    createdById: DEMO_USERS.member.id,
    updatedById: DEMO_USERS.member.id,
    createdAt: new Date('2026-04-01T10:15:00.000Z'),
    updatedAt: new Date('2026-04-04T12:00:00.000Z'),
  },
  {
    id: 'demo-task-notes',
    projectId: DEMO_PROJECTS.primary.id,
    title: 'Review post-deploy notes',
    description: null,
    statusId: DEMO_PROJECT_STATUSES.primaryTodo.id,
    position: 2,
    assigneeId: null,
    dueDate: null,
    createdById: DEMO_USERS.member.id,
    updatedById: null,
    createdAt: new Date('2026-04-01T11:00:00.000Z'),
    updatedAt: new Date('2026-04-01T11:00:00.000Z'),
  },
  {
    id: 'demo-task-admin-access',
    projectId: DEMO_PROJECTS.secondary.id,
    title: 'Confirm admin fallback access',
    description: 'Validate operational access for the seeded admin account.',
    statusId: DEMO_PROJECT_STATUSES.secondaryInProgress.id,
    position: 1,
    assigneeId: DEMO_USERS.admin.id,
    dueDate: new Date('2026-04-11T00:00:00.000Z'),
    createdById: DEMO_USERS.admin.id,
    updatedById: DEMO_USERS.admin.id,
    createdAt: new Date('2026-04-02T09:00:00.000Z'),
    updatedAt: new Date('2026-04-03T15:00:00.000Z'),
  },
  {
    id: 'demo-task-archive',
    projectId: DEMO_PROJECTS.secondary.id,
    title: 'Archive prior dry run',
    description: 'Keep the operations board tidy before handoff.',
    statusId: DEMO_PROJECT_STATUSES.secondaryDone.id,
    position: 1,
    assigneeId: null,
    dueDate: null,
    createdById: DEMO_USERS.admin.id,
    updatedById: DEMO_USERS.admin.id,
    createdAt: new Date('2026-04-02T10:00:00.000Z'),
    updatedAt: new Date('2026-04-02T16:30:00.000Z'),
  },
] as const;

export const DEMO_LOG_TIMESTAMPS = {
  created: new Date('2026-04-01T10:20:00.000Z'),
  titleUpdated: new Date('2026-04-02T09:30:00.000Z'),
  dueDateUpdated: new Date('2026-04-02T09:45:00.000Z'),
  assigneeUpdated: new Date('2026-04-03T11:00:00.000Z'),
  statusChanged: new Date('2026-04-04T12:00:00.000Z'),
} as const;

export const DEMO_SEED_IDS = {
  projectIds: Object.values(DEMO_PROJECTS).map((project) => project.id),
  projectStatusIds: Object.values(DEMO_PROJECT_STATUSES).map(
    (status) => status.id,
  ),
  taskIds: DEMO_TASKS.map((task) => task.id),
  userIds: Object.values(DEMO_USERS).map((user) => user.id),
} as const;
