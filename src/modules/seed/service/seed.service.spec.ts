import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AppRole,
  Prisma,
  ProjectMemberRole,
  TaskLogEventType,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { TaskLogsService } from '../../task-logs/service/task-logs.service';
import {
  DEMO_PROJECTS,
  DEMO_PROJECT_STATUSES,
  DEMO_SEED_IDS,
  DEMO_USERS,
} from '../seed-data';
import { SeedService } from './seed.service';

type UserRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: AppRole;
  createdAt: Date;
  updatedAt: Date;
};

type RefreshTokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
};

type ProjectRecord = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
};

type ProjectMemberRecord = {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
  createdAt: Date;
};

type TaskRecord = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  statusId: string;
  position: number | null;
  assigneeId: string | null;
  dueDate: Date | null;
  createdById: string;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ProjectStatusRecord = {
  id: string;
  projectId: string;
  name: string;
  position: number;
  isClosed: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type TaskLogRecord = {
  id: string;
  taskId: string;
  actorId: string;
  eventType: TaskLogEventType;
  fieldName: string | null;
  oldValue: Prisma.JsonValue;
  newValue: Prisma.JsonValue;
  summary: string;
  createdAt: Date;
};

describe('SeedService', () => {
  let users: UserRecord[];
  let refreshTokens: RefreshTokenRecord[];
  let projects: ProjectRecord[];
  let projectMembers: ProjectMemberRecord[];
  let projectStatuses: ProjectStatusRecord[];
  let tasks: TaskRecord[];
  let taskLogs: TaskLogRecord[];
  let configValues: Record<string, boolean | string>;
  let seedService: SeedService;

  const mockPrismaService = {
    $transaction: jest.fn(),
    refreshToken: {
      deleteMany: jest.fn(),
    },
    emailVerificationToken: {
      deleteMany: jest.fn(),
    },
    projectInvite: {
      deleteMany: jest.fn(),
    },
    user: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
    },
    project: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    projectMember: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    projectStatus: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    task: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    taskLog: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  } as unknown as PrismaService & {
    $transaction: jest.Mock;
    refreshToken: {
      deleteMany: jest.Mock;
    };
    emailVerificationToken: {
      deleteMany: jest.Mock;
    };
    projectInvite: {
      deleteMany: jest.Mock;
    };
    user: {
      createMany: jest.Mock;
      deleteMany: jest.Mock;
      findUnique: jest.Mock;
    };
    project: {
      createMany: jest.Mock;
      deleteMany: jest.Mock;
    };
    projectMember: {
      createMany: jest.Mock;
      deleteMany: jest.Mock;
    };
    projectStatus: {
      createMany: jest.Mock;
      deleteMany: jest.Mock;
    };
    task: {
      createMany: jest.Mock;
      deleteMany: jest.Mock;
    };
    taskLog: {
      create: jest.Mock;
      deleteMany: jest.Mock;
    };
  };

  const configService = {
    get: jest.fn((key: string) => configValues[key]),
  } as unknown as ConfigService;

  beforeEach(() => {
    users = [];
    refreshTokens = [];
    projects = [];
    projectMembers = [];
    projectStatuses = [];
    tasks = [];
    taskLogs = [];
    configValues = {
      NODE_ENV: 'development',
      SEED_ENABLED: true,
    };

    jest.clearAllMocks();

    mockPrismaService.$transaction.mockImplementation(
      (
        callback: (
          transactionClient: typeof mockPrismaService,
        ) => Promise<unknown>,
      ) => callback(mockPrismaService),
    );
    mockPrismaService.refreshToken.deleteMany.mockImplementation(
      ({ where }: { where: { userId: { in: string[] } } }) => {
        refreshTokens = refreshTokens.filter(
          (token) => !where.userId.in.includes(token.userId),
        );

        return { count: 0 };
      },
    );
    mockPrismaService.emailVerificationToken.deleteMany.mockResolvedValue({
      count: 0,
    });
    mockPrismaService.projectInvite.deleteMany.mockResolvedValue({
      count: 0,
    });
    mockPrismaService.user.createMany.mockImplementation(
      ({ data }: { data: UserRecord[] }) => {
        users = [...users, ...data];

        return {
          count: data.length,
        };
      },
    );
    mockPrismaService.user.deleteMany.mockImplementation(
      ({ where }: { where: { id: { in: string[] } } }) => {
        users = users.filter((user) => !where.id.in.includes(user.id));

        return { count: 0 };
      },
    );
    mockPrismaService.user.findUnique.mockImplementation(
      ({ where }: { where: { email?: string; id?: string } }) =>
        users.find((user) =>
          where.email ? user.email === where.email : user.id === where.id,
        ) ?? null,
    );
    mockPrismaService.project.createMany.mockImplementation(
      ({ data }: { data: ProjectRecord[] }) => {
        projects = [...projects, ...data];

        return {
          count: data.length,
        };
      },
    );
    mockPrismaService.project.deleteMany.mockImplementation(
      ({ where }: { where: { id: { in: string[] } } }) => {
        projects = projects.filter(
          (project) => !where.id.in.includes(project.id),
        );

        return { count: 0 };
      },
    );
    mockPrismaService.projectMember.createMany.mockImplementation(
      ({ data }: { data: ProjectMemberRecord[] }) => {
        projectMembers = [...projectMembers, ...data];

        return {
          count: data.length,
        };
      },
    );
    mockPrismaService.projectMember.deleteMany.mockImplementation(
      ({
        where,
      }: {
        where: {
          OR: Array<{
            projectId?: { in: string[] };
            userId?: { in: string[] };
          }>;
        };
      }) => {
        projectMembers = projectMembers.filter(
          (membership) =>
            !where.OR.some((condition) => {
              if (condition.projectId) {
                return condition.projectId.in.includes(membership.projectId);
              }

              if (condition.userId) {
                return condition.userId.in.includes(membership.userId);
              }

              return false;
            }),
        );

        return { count: 0 };
      },
    );
    mockPrismaService.projectStatus.createMany.mockImplementation(
      ({ data }: { data: ProjectStatusRecord[] }) => {
        projectStatuses = [...projectStatuses, ...data];

        return {
          count: data.length,
        };
      },
    );
    mockPrismaService.projectStatus.deleteMany.mockImplementation(
      ({ where }: { where: { id: { in: string[] } } }) => {
        projectStatuses = projectStatuses.filter(
          (status) => !where.id.in.includes(status.id),
        );

        return { count: 0 };
      },
    );
    mockPrismaService.task.createMany.mockImplementation(
      ({ data }: { data: TaskRecord[] }) => {
        tasks = [...tasks, ...data];

        return {
          count: data.length,
        };
      },
    );
    mockPrismaService.task.deleteMany.mockImplementation(
      ({ where }: { where: { id: { in: string[] } } }) => {
        tasks = tasks.filter((task) => !where.id.in.includes(task.id));

        return { count: 0 };
      },
    );
    mockPrismaService.taskLog.create.mockImplementation(
      ({ data }: { data: Omit<TaskLogRecord, 'id'> }) => {
        taskLogs = [
          ...taskLogs,
          {
            id: `log-${taskLogs.length + 1}`,
            taskId: data.taskId,
            actorId: data.actorId,
            eventType: data.eventType,
            fieldName: data.fieldName,
            oldValue: normalizeJsonValue(data.oldValue),
            newValue: normalizeJsonValue(data.newValue),
            summary: data.summary,
            createdAt: data.createdAt,
          },
        ];

        return taskLogs[taskLogs.length - 1];
      },
    );
    mockPrismaService.taskLog.deleteMany.mockImplementation(
      ({ where }: { where: { taskId: { in: string[] } } }) => {
        taskLogs = taskLogs.filter(
          (taskLog) => !where.taskId.in.includes(taskLog.taskId),
        );

        return { count: 0 };
      },
    );

    const taskLogsService = new TaskLogsService(mockPrismaService);
    seedService = new SeedService(
      mockPrismaService,
      configService,
      taskLogsService,
    );
  });

  it('creates the deterministic demo dataset and audit logs', async () => {
    const result = await seedService.initializeDemoData();

    expect(result).toEqual({
      message: 'Seed completed',
      users: 2,
      projects: 2,
      tasks: 6,
    });
    expect(users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: DEMO_USERS.admin.email,
          role: AppRole.ADMIN,
        }),
        expect.objectContaining({
          email: DEMO_USERS.member.email,
          role: AppRole.MEMBER,
        }),
      ]),
    );
    expect(projects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: DEMO_PROJECTS.primary.name }),
        expect.objectContaining({ name: DEMO_PROJECTS.secondary.name }),
      ]),
    );
    for (const status of Object.values(DEMO_PROJECT_STATUSES)) {
      expect(projectStatuses).toContainEqual(
        expect.objectContaining({
          id: status.id,
          projectId: status.projectId,
          name: status.name,
        }),
      );
    }
    expect(
      tasks.filter((task) => task.projectId === DEMO_PROJECTS.primary.id),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          statusId: DEMO_PROJECT_STATUSES.primaryTodo.id,
        }),
        expect.objectContaining({
          statusId: DEMO_PROJECT_STATUSES.primaryInProgress.id,
        }),
        expect.objectContaining({
          statusId: DEMO_PROJECT_STATUSES.primaryDone.id,
        }),
      ]),
    );
    expect(taskLogs.map((taskLog) => taskLog.eventType)).toEqual([
      TaskLogEventType.TASK_CREATED,
      TaskLogEventType.TASK_UPDATED,
      TaskLogEventType.TASK_UPDATED,
      TaskLogEventType.TASK_UPDATED,
      TaskLogEventType.STATUS_CHANGED,
    ]);
  });

  it('resets only seed-owned records on rerun and preserves unrelated data', async () => {
    users = [
      {
        id: 'other-user',
        name: 'Other User',
        email: 'other@example.com',
        passwordHash: 'hash',
        role: AppRole.MEMBER,
        createdAt: new Date('2026-04-01T07:00:00.000Z'),
        updatedAt: new Date('2026-04-01T07:00:00.000Z'),
      },
    ];
    projects = [
      {
        id: 'other-project',
        name: 'Other Project',
        description: 'Keep this record untouched.',
        ownerId: 'other-user',
        createdAt: new Date('2026-04-01T07:10:00.000Z'),
        updatedAt: new Date('2026-04-01T07:10:00.000Z'),
      },
    ];
    projectMembers = [
      {
        id: 'other-membership',
        projectId: 'other-project',
        userId: 'other-user',
        role: ProjectMemberRole.OWNER,
        createdAt: new Date('2026-04-01T07:10:00.000Z'),
      },
    ];
    tasks = [
      {
        id: 'other-task',
        projectId: 'other-project',
        title: 'Keep unrelated work',
        description: null,
        statusId: 'other-status',
        position: 1,
        assigneeId: null,
        dueDate: null,
        createdById: 'other-user',
        updatedById: null,
        createdAt: new Date('2026-04-01T07:20:00.000Z'),
        updatedAt: new Date('2026-04-01T07:20:00.000Z'),
      },
    ];
    taskLogs = [
      {
        id: 'other-log',
        taskId: 'other-task',
        actorId: 'other-user',
        eventType: TaskLogEventType.TASK_CREATED,
        fieldName: null,
        oldValue: null,
        newValue: null,
        summary: 'Other User created the task',
        createdAt: new Date('2026-04-01T07:20:00.000Z'),
      },
    ];

    await seedService.initializeDemoData();
    await seedService.initializeDemoData();

    expect(users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'other-user' }),
        expect.objectContaining({ id: DEMO_USERS.admin.id }),
        expect.objectContaining({ id: DEMO_USERS.member.id }),
      ]),
    );
    expect(projects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'other-project' }),
        expect.objectContaining({ id: DEMO_PROJECTS.primary.id }),
        expect.objectContaining({ id: DEMO_PROJECTS.secondary.id }),
      ]),
    );
    expect(tasks).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'other-task' })]),
    );
    expect(
      users.filter((user) =>
        (DEMO_SEED_IDS.userIds as readonly string[]).includes(user.id),
      ),
    ).toHaveLength(2);
    expect(
      projects.filter((project) =>
        (DEMO_SEED_IDS.projectIds as readonly string[]).includes(project.id),
      ),
    ).toHaveLength(2);
    expect(
      tasks.filter((task) =>
        (DEMO_SEED_IDS.taskIds as readonly string[]).includes(task.id),
      ),
    ).toHaveLength(6);
  });

  it('rejects initialization when the seed endpoint is disabled', async () => {
    configValues.SEED_ENABLED = false;

    await expect(seedService.initializeDemoData()).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects initialization in production even when the flag is enabled', async () => {
    configValues.NODE_ENV = 'production';

    await expect(seedService.initializeDemoData()).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

function normalizeJsonValue(value: unknown): Prisma.JsonValue {
  if (value === Prisma.JsonNull || value === null) {
    return null;
  }

  return value as Prisma.JsonValue;
}
