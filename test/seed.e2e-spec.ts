import { ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  AppRole,
  Prisma,
  ProjectMemberRole,
  TaskLogEventType,
} from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../src/database/prisma.service';
import { AuthService } from '../src/modules/auth/service/auth.service';
import { ProjectsService } from '../src/modules/projects/service/projects.service';
import { ProjectActivityService } from '../src/modules/projects/service/project-activity.service';
import { ProjectMutationsService } from '../src/modules/projects/service/project-mutations.service';
import { ProjectQueriesService } from '../src/modules/projects/service/project-queries.service';
import { ProjectStatusesService } from '../src/modules/projects/service/project-statuses.service';
import { MailService } from '../src/modules/mail/service/mail.service';
import { SeedController } from '../src/modules/seed/controller/seed.controller';
import {
  DEMO_PASSWORD,
  DEMO_PROJECTS,
  DEMO_PROJECT_STATUSES,
  DEMO_SEED_IDS,
  DEMO_USERS,
} from '../src/modules/seed/seed-data';
import { SeedService } from '../src/modules/seed/service/seed.service';
import { TaskLogsService } from '../src/modules/task-logs/service/task-logs.service';
import { TaskCommandsService } from '../src/modules/tasks/service/task-commands.service';
import { TaskQueriesService } from '../src/modules/tasks/service/task-queries.service';
import { TasksService } from '../src/modules/tasks/service/tasks.service';

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

type ProjectStatusRecord = {
  id: string;
  projectId: string;
  name: string;
  position: number;
  isClosed: boolean;
  createdAt: Date;
  updatedAt: Date;
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

describe('Seed demo flow (e2e)', () => {
  let users: UserRecord[];
  let refreshTokens: RefreshTokenRecord[];
  let projects: ProjectRecord[];
  let projectMembers: ProjectMemberRecord[];
  let projectStatuses: ProjectStatusRecord[];
  let tasks: TaskRecord[];
  let taskLogs: TaskLogRecord[];
  let configValues: Record<string, boolean | string | number>;

  let seedController: SeedController;
  let authService: AuthService;
  let projectsService: ProjectsService;
  let tasksService: TasksService;
  let taskLogsService: TaskLogsService;
  const mockMailService = {
    sendMail: jest.fn().mockResolvedValue(undefined),
  };

  const mockPrismaService = {
    $transaction: jest.fn(),
    refreshToken: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
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
      findMany: jest.fn(),
    },
    projectStatus: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
    projectMember: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
    },
    task: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    taskLog: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
  } as unknown as PrismaService & {
    $transaction: jest.Mock;
    refreshToken: {
      create: jest.Mock;
      deleteMany: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
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
      findMany: jest.Mock;
    };
    projectStatus: {
      createMany: jest.Mock;
      deleteMany: jest.Mock;
      findMany: jest.Mock;
    };
    projectMember: {
      createMany: jest.Mock;
      deleteMany: jest.Mock;
      findUnique: jest.Mock;
    };
    task: {
      createMany: jest.Mock;
      deleteMany: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
    taskLog: {
      create: jest.Mock;
      deleteMany: jest.Mock;
      findMany: jest.Mock;
    };
  };

  const configService = {
    get: jest.fn((key: string) => configValues[key]),
    getOrThrow: jest.fn((key: string) => {
      const value = configValues[key];

      if (value === undefined) {
        throw new Error(`Missing config value: ${key}`);
      }

      return value;
    }),
  } as unknown as ConfigService;

  const jwtService = {
    signAsync: jest.fn((_payload: unknown, options?: { secret?: string }) =>
      options?.secret === 'demo-refresh-secret'
        ? 'demo-refresh-token'
        : 'demo-access-token',
    ),
    verifyAsync: jest.fn(),
  } as unknown as JwtService;

  beforeEach(async () => {
    users = [];
    refreshTokens = [];
    projects = [];
    projectMembers = [];
    projectStatuses = [];
    tasks = [];
    taskLogs = [];
    configValues = {
      APP_URL: 'http://localhost:4000',
      FRONTEND_URL: 'http://localhost:3000',
      JWT_ACCESS_SECRET: 'demo-access-secret',
      JWT_ACCESS_TTL: '15m',
      JWT_REFRESH_SECRET: 'demo-refresh-secret',
      JWT_REFRESH_TTL: '7d',
      NODE_ENV: 'development',
      PORT: 4000,
      REFRESH_COOKIE_NAME: 'archon_refresh_token',
      REFRESH_COOKIE_SECURE: false,
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
    mockPrismaService.refreshToken.create.mockImplementation(
      ({
        data,
      }: {
        data: {
          userId: string;
          tokenHash: string;
          expiresAt: Date;
        };
      }) => {
        const refreshToken = {
          id: `refresh-${refreshTokens.length + 1}`,
          userId: data.userId,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
          revokedAt: null,
          createdAt: new Date('2026-04-05T10:00:00.000Z'),
        };

        refreshTokens = [...refreshTokens, refreshToken];

        return refreshToken;
      },
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
    mockPrismaService.refreshToken.findMany.mockImplementation(
      ({ where }: { where: { userId: string; revokedAt: null } }) =>
        refreshTokens.filter(
          (token) => token.userId === where.userId && token.revokedAt === null,
        ),
    );
    mockPrismaService.refreshToken.update.mockImplementation(
      ({
        where,
        data,
      }: {
        where: { id: string };
        data: { revokedAt: Date };
      }) => {
        const existingToken = refreshTokens.find(
          (token) => token.id === where.id,
        );

        if (!existingToken) {
          throw new Error('Refresh token not found');
        }

        const updatedToken = {
          ...existingToken,
          revokedAt: data.revokedAt,
        };

        refreshTokens = refreshTokens.map((token) =>
          token.id === where.id ? updatedToken : token,
        );

        return updatedToken;
      },
    );
    mockPrismaService.user.createMany.mockImplementation(
      ({ data }: { data: UserRecord[] }) => {
        users = [...users, ...data];

        return { count: data.length };
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

        return { count: data.length };
      },
    );
    mockPrismaService.projectStatus.createMany.mockImplementation(
      ({ data }: { data: ProjectStatusRecord[] }) => {
        projectStatuses = [...projectStatuses, ...data];

        return { count: data.length };
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
    mockPrismaService.projectStatus.findMany.mockImplementation(
      ({ where }: { where: { projectId: string } }) =>
        projectStatuses
          .filter((status) => status.projectId === where.projectId)
          .sort((left, right) => left.position - right.position)
          .map((status) => ({
            ...status,
            tasks: tasks
              .filter((task) => task.statusId === status.id)
              .map((task) => ({
                ...task,
                status: {
                  id: status.id,
                  name: status.name,
                  position: status.position,
                  isClosed: status.isClosed,
                },
              })),
          })),
    );
    mockPrismaService.project.deleteMany.mockImplementation(
      ({ where }: { where: { id: { in: string[] } } }) => {
        projects = projects.filter(
          (project) => !where.id.in.includes(project.id),
        );

        return { count: 0 };
      },
    );
    mockPrismaService.project.findMany.mockImplementation(
      ({
        where,
      }: {
        where?:
          | undefined
          | {
              OR?: Array<
                { ownerId: string } | { members: { some: { userId: string } } }
              >;
            };
      }) => {
        const accessibleProjects =
          where?.OR && where.OR.length > 0
            ? projects.filter((project) =>
                where.OR?.some((condition) => {
                  if ('ownerId' in condition) {
                    return project.ownerId === condition.ownerId;
                  }

                  return projectMembers.some(
                    (membership) =>
                      membership.projectId === project.id &&
                      membership.userId === condition.members.some.userId,
                  );
                }),
              )
            : projects;

        return accessibleProjects.map((project) => ({
          id: project.id,
          name: project.name,
          description: project.description,
          ownerId: project.ownerId,
          statuses: projectStatuses
            .filter((status) => status.projectId === project.id)
            .sort((left, right) => left.position - right.position)
            .map((status) => ({
              id: status.id,
              name: status.name,
              position: status.position,
              isClosed: status.isClosed,
              tasks: tasks
                .filter((task) => task.statusId === status.id)
                .map((task) => ({ id: task.id })),
            })),
        }));
      },
    );
    mockPrismaService.projectMember.createMany.mockImplementation(
      ({ data }: { data: ProjectMemberRecord[] }) => {
        projectMembers = [...projectMembers, ...data];

        return { count: data.length };
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
    mockPrismaService.projectMember.findUnique.mockResolvedValue(null);
    mockPrismaService.task.createMany.mockImplementation(
      ({ data }: { data: TaskRecord[] }) => {
        tasks = [...tasks, ...data];

        return { count: data.length };
      },
    );
    mockPrismaService.task.deleteMany.mockImplementation(
      ({ where }: { where: { id: { in: string[] } } }) => {
        tasks = tasks.filter((task) => !where.id.in.includes(task.id));

        return { count: 0 };
      },
    );
    mockPrismaService.task.findMany.mockImplementation(
      ({ where }: { where: { projectId: string } }) =>
        tasks.filter((task) => task.projectId === where.projectId),
    );
    mockPrismaService.task.findUnique.mockImplementation(
      ({ where }: { where: { id: string } }) =>
        tasks.find((task) => task.id === where.id) ?? null,
    );
    mockPrismaService.taskLog.create.mockImplementation(
      ({ data }: { data: Omit<TaskLogRecord, 'id'> }) => {
        const taskLog = {
          id: `log-${taskLogs.length + 1}`,
          taskId: data.taskId,
          actorId: data.actorId,
          eventType: data.eventType,
          fieldName: data.fieldName,
          oldValue: normalizeJsonValue(data.oldValue),
          newValue: normalizeJsonValue(data.newValue),
          summary: data.summary,
          createdAt: data.createdAt,
        };

        taskLogs = [...taskLogs, taskLog];

        return taskLog;
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
    mockPrismaService.taskLog.findMany.mockImplementation(
      ({ where }: { where: { taskId: string } }) =>
        taskLogs
          .filter((taskLog) => taskLog.taskId === where.taskId)
          .sort(
            (left, right) =>
              right.createdAt.getTime() - left.createdAt.getTime(),
          )
          .map((taskLog) => ({
            ...taskLog,
            actor: {
              id: taskLog.actorId,
              name:
                users.find((user) => user.id === taskLog.actorId)?.name ??
                taskLog.actorId,
            },
          })),
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SeedController],
      providers: [
        SeedService,
        TaskLogsService,
        TaskQueriesService,
        TaskCommandsService,
        TasksService,
        ProjectQueriesService,
        ProjectMutationsService,
        ProjectStatusesService,
        ProjectActivityService,
        ProjectsService,
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
      ],
    }).compile();

    seedController = moduleFixture.get(SeedController);
    authService = moduleFixture.get(AuthService);
    projectsService = moduleFixture.get(ProjectsService);
    tasksService = moduleFixture.get(TasksService);
    taskLogsService = moduleFixture.get(TaskLogsService);
  });

  it('rejects seed initialization when the feature flag is disabled', async () => {
    configValues.SEED_ENABLED = false;

    await expect(seedController.initializeSeedData()).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects seed initialization in production mode', async () => {
    configValues.NODE_ENV = 'production';

    await expect(seedController.initializeSeedData()).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('creates demo data, allows seeded member login, and exposes usable board/log data', async () => {
    const seedResult = await seedController.initializeSeedData();

    expect(seedResult).toEqual({
      message: 'Seed completed',
      users: 2,
      projects: 2,
      tasks: 6,
    });

    const loginResult = await authService.login({
      email: DEMO_USERS.member.email,
      password: DEMO_PASSWORD,
    });

    expect(loginResult.user.email).toBe(DEMO_USERS.member.email);
    expect(loginResult.accessToken).toBe('demo-access-token');
    expect(refreshTokens).toHaveLength(1);

    const projectList = await projectsService.listProjects(loginResult.user);
    const projectTasks = await tasksService.listProjectTasks(
      DEMO_PROJECTS.primary.id,
    );
    const taskLogTimeline = await taskLogsService.listTaskLogs(
      'demo-task-narrative',
      {},
    );

    expect(projectList.items).toHaveLength(2);
    expect(projectList.items.map((project) => project.id)).toEqual(
      expect.arrayContaining([
        DEMO_PROJECTS.primary.id,
        DEMO_PROJECTS.secondary.id,
      ]),
    );
    expect(
      projectTasks.statuses.find(
        (status) => status.id === DEMO_PROJECT_STATUSES.primaryTodo.id,
      )?.tasks.length ?? 0,
    ).toBeGreaterThan(0);
    expect(
      projectTasks.statuses.find(
        (status) => status.id === DEMO_PROJECT_STATUSES.primaryInProgress.id,
      )?.tasks.length ?? 0,
    ).toBeGreaterThan(0);
    expect(
      projectTasks.statuses.find(
        (status) => status.id === DEMO_PROJECT_STATUSES.primaryDone.id,
      )?.tasks.length ?? 0,
    ).toBeGreaterThan(0);
    expect(taskLogTimeline.items).not.toHaveLength(0);
    expect(taskLogTimeline.items[0].eventType).toBe(
      TaskLogEventType.STATUS_CHANGED,
    );
    expect(
      taskLogs.filter((taskLog) =>
        (DEMO_SEED_IDS.taskIds as readonly string[]).includes(taskLog.taskId),
      ),
    ).toHaveLength(5);
  });
});

function normalizeJsonValue(value: unknown): Prisma.JsonValue {
  if (value === Prisma.JsonNull || value === null) {
    return null;
  }

  return value as Prisma.JsonValue;
}
