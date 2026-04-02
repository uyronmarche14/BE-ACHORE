import {
  ArgumentsHost,
  type ExecutionContext,
  type INestApplication,
} from '@nestjs/common';
import { TaskLogEventType, TaskStatus } from '@prisma/client';
import { Reflector } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { configureApplication } from '../src/common/bootstrap/configure-application';
import { PrismaService } from '../src/database/prisma.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { ResourceAccessGuard } from '../src/modules/auth/guards/resource-access.guard';
import { AuthService } from '../src/modules/auth/service/auth.service';
import { ResourceAuthorizationService } from '../src/modules/auth/service/resource-authorization.service';
import type { AuthenticatedRequest } from '../src/modules/auth/types/authenticated-request.type';
import { TaskLogsController } from '../src/modules/task-logs/controller/task-logs.controller';
import { TaskLogsService } from '../src/modules/task-logs/service/task-logs.service';
import { TasksController } from '../src/modules/tasks/controller/tasks.controller';
import { TasksService } from '../src/modules/tasks/service/tasks.service';

describe('TaskLogsController (e2e)', () => {
  let app: INestApplication;
  let taskLogsController: TaskLogsController;
  let tasksController: TasksController;
  let jwtAuthGuard: JwtAuthGuard;
  let resourceAccessGuard: ResourceAccessGuard;

  let taskLogsState: Array<{
    id: string;
    taskId: string;
    actorId: string;
    eventType: TaskLogEventType;
    fieldName: string | null;
    oldValue: unknown;
    newValue: unknown;
    summary: string;
    createdAt: Date;
  }>;

  let taskState: Record<
    string,
    {
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
    }
  >;

  const mockAuthService = {
    authenticateAccessToken: jest.fn(),
  };

  const users = {
    'owner-1': { id: 'owner-1', name: 'Owner User' },
    'member-1': { id: 'member-1', name: 'Member User' },
    'member-2': { id: 'member-2', name: 'Jordan Lane' },
  };

  const mockPrismaService = {
    $transaction: jest.fn(),
    project: {
      findUnique: jest.fn(),
    },
    projectMember: {
      findUnique: jest.fn(),
    },
    task: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    taskLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    taskLogsState = [];
    taskState = {
      'task-1': {
        id: 'task-1',
        projectId: 'project-1',
        title: 'Draft API envelope',
        description: null,
        status: TaskStatus.TODO,
        position: null,
        assigneeId: null,
        dueDate: null,
        createdAt: new Date('2026-04-01T09:00:00.000Z'),
        updatedAt: new Date('2026-04-01T09:00:00.000Z'),
      },
    };

    mockAuthService.authenticateAccessToken.mockImplementation(
      (accessToken: string | null) => {
        if (accessToken === 'owner-token') {
          return Promise.resolve({
            id: 'owner-1',
            name: 'Owner User',
            email: 'owner@example.com',
            role: 'MEMBER',
          });
        }

        if (accessToken === 'member-token') {
          return Promise.resolve({
            id: 'member-1',
            name: 'Member User',
            email: 'member@example.com',
            role: 'MEMBER',
          });
        }

        if (accessToken === 'outsider-token') {
          return Promise.resolve({
            id: 'outsider-1',
            name: 'Outsider User',
            email: 'outsider@example.com',
            role: 'MEMBER',
          });
        }

        return Promise.resolve({
          id: 'admin-1',
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'ADMIN',
        });
      },
    );

    mockPrismaService.$transaction.mockImplementation(
      async (
        callback: (
          transactionClient: typeof mockPrismaService,
        ) => Promise<unknown>,
      ) => callback(mockPrismaService),
    );
    mockPrismaService.project.findUnique.mockResolvedValue({
      id: 'project-1',
      ownerId: 'owner-1',
    });
    mockPrismaService.projectMember.findUnique.mockImplementation(
      ({
        where,
      }: {
        where: { projectId_userId: { projectId: string; userId: string } };
      }) =>
        where.projectId_userId.userId === 'member-1'
          ? { id: 'membership-1' }
          : null,
    );
    mockPrismaService.user.findUnique.mockImplementation(
      ({ where }: { where: { id: string } }) =>
        users[where.id as keyof typeof users] ?? null,
    );
    mockPrismaService.task.findUnique.mockImplementation(
      ({ where }: { where: { id: string } }) => {
        const task = taskState[where.id];

        if (!task) {
          return null;
        }

        return {
          ...task,
          project: {
            ownerId: 'owner-1',
          },
        };
      },
    );
    mockPrismaService.task.create.mockImplementation(
      ({
        data,
      }: {
        data: {
          projectId: string;
          title: string;
          description: string | null;
          status: TaskStatus;
          assigneeId: string | null;
          dueDate: Date | null;
          createdById: string;
        };
      }) => {
        const createdTask = {
          id: 'task-2',
          projectId: data.projectId,
          title: data.title,
          description: data.description,
          status: data.status,
          position: null,
          assigneeId: data.assigneeId,
          dueDate: data.dueDate,
          createdAt: new Date('2026-04-02T09:00:00.000Z'),
          updatedAt: new Date('2026-04-02T09:00:00.000Z'),
        };

        taskState[createdTask.id] = createdTask;

        return createdTask;
      },
    );
    mockPrismaService.task.update.mockImplementation(
      ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const existingTask = taskState[where.id];

        if (!existingTask) {
          const prismaError = new Error('Task not found');
          (
            prismaError as Error & {
              code: string;
            }
          ).code = 'P2025';
          throw prismaError;
        }

        const updatedTask = {
          ...existingTask,
          ...(data.title !== undefined ? { title: data.title as string } : {}),
          ...(data.description !== undefined
            ? { description: data.description as string | null }
            : {}),
          ...(data.assigneeId !== undefined
            ? { assigneeId: data.assigneeId as string | null }
            : {}),
          ...(data.dueDate !== undefined
            ? { dueDate: data.dueDate as Date | null }
            : {}),
          ...(data.status !== undefined
            ? { status: data.status as TaskStatus }
            : {}),
          ...(data.position !== undefined
            ? { position: data.position as number | null }
            : {}),
          updatedAt: new Date(
            data.status !== undefined
              ? '2026-04-04T09:00:00.000Z'
              : '2026-04-03T09:00:00.000Z',
          ),
        };

        taskState[where.id] = updatedTask;

        return updatedTask;
      },
    );
    mockPrismaService.taskLog.create.mockImplementation(
      ({
        data,
      }: {
        data: {
          taskId: string;
          actorId: string;
          eventType: TaskLogEventType;
          fieldName: string | null;
          oldValue: unknown;
          newValue: unknown;
          summary: string;
        };
      }) => {
        const createdLog = {
          id: `log-${taskLogsState.length + 1}`,
          taskId: data.taskId,
          actorId: data.actorId,
          eventType: data.eventType,
          fieldName: data.fieldName,
          oldValue: data.oldValue === null ? null : data.oldValue,
          newValue: data.newValue === null ? null : data.newValue,
          summary: data.summary,
          createdAt: new Date(
            `2026-04-0${taskLogsState.length + 2}T09:00:00.000Z`,
          ),
        };

        taskLogsState = [...taskLogsState, createdLog];

        return createdLog;
      },
    );
    mockPrismaService.taskLog.findMany.mockImplementation(
      ({ where }: { where: { taskId: string } }) =>
        taskLogsState
          .filter((taskLog) => taskLog.taskId === where.taskId)
          .sort(
            (left, right) =>
              right.createdAt.getTime() - left.createdAt.getTime(),
          )
          .map((taskLog) => ({
            ...taskLog,
            actor: users[taskLog.actorId as keyof typeof users],
          })),
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TasksController, TaskLogsController],
      providers: [
        Reflector,
        TasksService,
        TaskLogsService,
        JwtAuthGuard,
        ResourceAccessGuard,
        ResourceAuthorizationService,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();

    tasksController = moduleFixture.get(TasksController);
    taskLogsController = moduleFixture.get(TaskLogsController);
    jwtAuthGuard = moduleFixture.get(JwtAuthGuard);
    resourceAccessGuard = moduleFixture.get(ResourceAccessGuard);
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 401 for unauthenticated task-log requests', async () => {
    await expect(
      executeTaskLogsRoute({
        taskLogsController,
        jwtAuthGuard,
        resourceAccessGuard,
        request: createRequest({
          params: {
            taskId: 'task-1',
          },
        }),
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication is required',
      },
    });
  });

  it('returns 403 when a user tries to load logs outside their project scope', async () => {
    await expect(
      executeTaskLogsRoute({
        taskLogsController,
        jwtAuthGuard,
        resourceAccessGuard,
        request: createRequest({
          authorization: 'Bearer outsider-token',
          params: {
            taskId: 'task-1',
          },
        }),
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'FORBIDDEN',
        message: 'You do not have access to this task',
      },
    });
  });

  it('returns a normalized 404 envelope when a guarded task does not exist for log retrieval', async () => {
    const request = createRequest({
      authorization: 'Bearer member-token',
      params: {
        taskId: 'missing-task',
      },
    });
    const response = createResponse();
    const exceptionFilter = new GlobalExceptionFilter();

    try {
      await executeTaskLogsRoute({
        taskLogsController,
        jwtAuthGuard,
        resourceAccessGuard,
        request,
      });
    } catch (error) {
      exceptionFilter.catch(error, createArgumentsHost(request, response));
    }

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      data: null,
      meta: {
        requestId: 'req_unknown',
        timestamp: expect.any(String) as unknown,
      },
      error: {
        code: 'NOT_FOUND',
        message: 'Task not found',
        details: null,
      },
    });
  });

  it('returns an empty list when a task has no log history yet', async () => {
    await expect(
      executeTaskLogsRoute({
        taskLogsController,
        jwtAuthGuard,
        resourceAccessGuard,
        request: createRequest({
          authorization: 'Bearer member-token',
          params: {
            taskId: 'task-1',
          },
        }),
      }),
    ).resolves.toEqual({
      items: [],
    });
  });

  it('returns newest-first logs after create, update, and status patch flows', async () => {
    await executeTaskRoute({
      tasksController,
      jwtAuthGuard,
      resourceAccessGuard,
      method: 'createTask',
      request: createRequest({
        authorization: 'Bearer member-token',
        params: {
          projectId: 'project-1',
        },
      }),
      body: {
        title: 'Ship launch checklist',
      },
    });

    await executeTaskRoute({
      tasksController,
      jwtAuthGuard,
      resourceAccessGuard,
      method: 'updateTask',
      request: createRequest({
        authorization: 'Bearer member-token',
        params: {
          taskId: 'task-1',
        },
      }),
      body: {
        title: 'Review API envelope',
        dueDate: '2026-04-20',
      },
    });

    await executeTaskRoute({
      tasksController,
      jwtAuthGuard,
      resourceAccessGuard,
      method: 'updateTaskStatus',
      request: createRequest({
        authorization: 'Bearer member-token',
        params: {
          taskId: 'task-1',
        },
      }),
      body: {
        status: TaskStatus.DONE,
        position: null,
      },
    });

    await expect(
      executeTaskLogsRoute({
        taskLogsController,
        jwtAuthGuard,
        resourceAccessGuard,
        request: createRequest({
          authorization: 'Bearer member-token',
          params: {
            taskId: 'task-1',
          },
        }),
      }),
    ).resolves.toEqual({
      items: [
        expect.objectContaining({
          eventType: TaskLogEventType.STATUS_CHANGED,
          fieldName: 'status',
          actor: {
            id: 'member-1',
            name: 'Member User',
          },
        }),
        expect.objectContaining({
          eventType: TaskLogEventType.TASK_UPDATED,
          fieldName: 'dueDate',
        }),
        expect.objectContaining({
          eventType: TaskLogEventType.TASK_UPDATED,
          fieldName: 'title',
        }),
      ],
    });
  });
});

async function executeTaskRoute({
  tasksController,
  jwtAuthGuard,
  resourceAccessGuard,
  method,
  request,
  body,
}: {
  tasksController: TasksController;
  jwtAuthGuard: JwtAuthGuard;
  resourceAccessGuard: ResourceAccessGuard;
  method: 'createTask' | 'updateTask' | 'updateTaskStatus';
  request: AuthenticatedRequest;
  body: {
    title?: string;
    description?: string | null;
    assigneeId?: string | null;
    dueDate?: string | null;
    status?: TaskStatus;
    position?: number | null;
  };
}) {
  const controllerMethod = tasksController[method];
  const executionContext = createExecutionContext(
    tasksController.constructor as typeof TasksController,
    controllerMethod as (...args: unknown[]) => unknown,
    request,
  );

  await jwtAuthGuard.canActivate(executionContext);
  await resourceAccessGuard.canActivate(executionContext);

  if (method === 'createTask') {
    return controllerMethod.call(
      tasksController,
      request.user,
      request.params.projectId,
      body,
    );
  }

  return controllerMethod.call(
    tasksController,
    request.user,
    request.params.taskId,
    body,
  );
}

async function executeTaskLogsRoute({
  taskLogsController,
  jwtAuthGuard,
  resourceAccessGuard,
  request,
}: {
  taskLogsController: TaskLogsController;
  jwtAuthGuard: JwtAuthGuard;
  resourceAccessGuard: ResourceAccessGuard;
  request: AuthenticatedRequest;
}) {
  // Preserve the decorated controller method reference so guard metadata resolves.
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const controllerHandler = TaskLogsController.prototype.listTaskLogs as (
    taskId: string,
  ) => Promise<unknown>;
  const executionContext = createExecutionContext(
    taskLogsController.constructor as typeof TaskLogsController,
    controllerHandler,
    request,
  );

  await jwtAuthGuard.canActivate(executionContext);
  await resourceAccessGuard.canActivate(executionContext);

  return taskLogsController.listTaskLogs(request.params.taskId);
}

function createExecutionContext(
  controllerClass: typeof TasksController | typeof TaskLogsController,
  handler: (...args: unknown[]) => unknown,
  request: AuthenticatedRequest,
): ExecutionContext {
  return {
    getClass: () => controllerClass,
    getHandler: () => handler,
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => undefined,
      getNext: () => undefined,
    }),
  } as ExecutionContext;
}

function createRequest({
  authorization,
  params,
}: {
  authorization?: string;
  params: Record<string, string>;
}): AuthenticatedRequest {
  return {
    params,
    headers: authorization
      ? {
          authorization,
        }
      : {},
  } as AuthenticatedRequest;
}

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

function createArgumentsHost(
  request: AuthenticatedRequest,
  response: ReturnType<typeof createResponse>,
): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
      getNext: () => undefined,
    }),
  } as ArgumentsHost;
}
