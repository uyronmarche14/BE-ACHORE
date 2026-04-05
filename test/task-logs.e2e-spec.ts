import {
  ArgumentsHost,
  type ExecutionContext,
  type INestApplication,
} from '@nestjs/common';
import { TaskLogEventType } from '@prisma/client';
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
import { TaskAttachmentsService } from '../src/modules/tasks/service/task-attachments.service';
import { TaskCommentsService } from '../src/modules/tasks/service/task-comments.service';
import { CreateTaskDto } from '../src/modules/tasks/dto/create-task.dto';
import { UpdateTaskDto } from '../src/modules/tasks/dto/update-task.dto';
import { UpdateTaskStatusDto } from '../src/modules/tasks/dto/update-task-status.dto';
import { TasksService } from '../src/modules/tasks/service/tasks.service';

describe('TaskLogsController (e2e)', () => {
  let app: INestApplication;
  let taskLogsController: TaskLogsController;
  let tasksController: TasksController;
  let jwtAuthGuard: JwtAuthGuard;
  let resourceAccessGuard: ResourceAccessGuard;

  const mockTasksService = {
    createTask: jest.fn(),
    updateTask: jest.fn(),
    updateTaskStatus: jest.fn(),
  };
  const mockTaskCommentsService = {
    listTaskComments: jest.fn(),
    createTaskComment: jest.fn(),
    updateTaskComment: jest.fn(),
    deleteTaskComment: jest.fn(),
  };
  const mockTaskAttachmentsService = {
    listTaskAttachments: jest.fn(),
    createTaskAttachment: jest.fn(),
    deleteTaskAttachment: jest.fn(),
  };

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
      statusId: string;
      statusName: string;
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
        statusId: 'status-todo',
        statusName: 'Todo',
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
            emailVerifiedAt: '2026-04-01T00:00:00.000Z',
          });
        }

        if (accessToken === 'member-token') {
          return Promise.resolve({
            id: 'member-1',
            name: 'Member User',
            email: 'member@example.com',
            role: 'MEMBER',
            emailVerifiedAt: '2026-04-01T00:00:00.000Z',
          });
        }

        if (accessToken === 'outsider-token') {
          return Promise.resolve({
            id: 'outsider-1',
            name: 'Outsider User',
            email: 'outsider@example.com',
            role: 'MEMBER',
            emailVerifiedAt: '2026-04-01T00:00:00.000Z',
          });
        }

        return Promise.resolve({
          id: 'admin-1',
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'ADMIN',
          emailVerifiedAt: '2026-04-01T00:00:00.000Z',
        });
      },
    );

    mockTasksService.createTask.mockReset();
    mockTasksService.updateTask.mockReset();
    mockTasksService.updateTaskStatus.mockReset();
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

    mockTasksService.createTask.mockImplementation(
      (_currentUser, projectId: string, createTaskDto: CreateTaskDto) => {
        const createdTask = {
          id: 'task-2',
          projectId,
          title: createTaskDto.title,
          description: createTaskDto.description ?? null,
          statusId: createTaskDto.statusId ?? 'status-todo',
          statusName: 'Todo',
          position: null,
          assigneeId: createTaskDto.assigneeId ?? null,
          dueDate: createTaskDto.dueDate
            ? new Date(createTaskDto.dueDate)
            : null,
          createdAt: new Date('2026-04-02T09:00:00.000Z'),
          updatedAt: new Date('2026-04-02T09:00:00.000Z'),
        };

        taskState[createdTask.id] = createdTask;
        taskLogsState = [
          ...taskLogsState,
          {
            id: `log-${taskLogsState.length + 1}`,
            taskId: createdTask.id,
            actorId: 'member-1',
            eventType: TaskLogEventType.TASK_CREATED,
            fieldName: null,
            oldValue: null,
            newValue: createdTask.title,
            summary: 'Task created',
            createdAt: new Date('2026-04-02T09:00:00.000Z'),
          },
        ];

        return Promise.resolve({
          id: createdTask.id,
          projectId: createdTask.projectId,
          title: createdTask.title,
          description: createdTask.description,
          acceptanceCriteria: null,
          notes: null,
          parentTaskId: null,
          statusId: createdTask.statusId,
          status: {
            id: createdTask.statusId,
            name: createdTask.statusName,
            position: 1,
            isClosed: false,
            color: 'SLATE',
          },
          position: createdTask.position,
          assigneeId: createdTask.assigneeId,
          dueDate: createdTask.dueDate
            ? createdTask.dueDate.toISOString().slice(0, 10)
            : null,
          links: [],
          checklistItems: [],
          subtasks: [],
          createdAt: createdTask.createdAt.toISOString(),
          updatedAt: createdTask.updatedAt.toISOString(),
        });
      },
    );
    mockTasksService.updateTask.mockImplementation(
      (_currentUser, taskId: string, updateTaskDto: UpdateTaskDto) => {
        const existingTask = taskState[taskId];

        if (!existingTask) {
          throw new Error('Task not found');
        }

        if (
          updateTaskDto.title !== undefined &&
          updateTaskDto.title !== existingTask.title
        ) {
          taskLogsState = [
            ...taskLogsState,
            {
              id: `log-${taskLogsState.length + 1}`,
              taskId,
              actorId: 'member-1',
              eventType: TaskLogEventType.TASK_UPDATED,
              fieldName: 'title',
              oldValue: existingTask.title,
              newValue: updateTaskDto.title,
              summary: 'Title updated',
              createdAt: new Date('2026-04-03T09:00:00.000Z'),
            },
          ];
          existingTask.title = updateTaskDto.title;
        }

        if (updateTaskDto.dueDate !== undefined) {
          const nextDueDate = updateTaskDto.dueDate
            ? new Date(updateTaskDto.dueDate)
            : null;
          taskLogsState = [
            ...taskLogsState,
            {
              id: `log-${taskLogsState.length + 1}`,
              taskId,
              actorId: 'member-1',
              eventType: TaskLogEventType.TASK_UPDATED,
              fieldName: 'dueDate',
              oldValue: existingTask.dueDate
                ? existingTask.dueDate.toISOString().slice(0, 10)
                : null,
              newValue: nextDueDate
                ? nextDueDate.toISOString().slice(0, 10)
                : null,
              summary: 'Due date updated',
              createdAt: new Date('2026-04-03T09:05:00.000Z'),
            },
          ];
          existingTask.dueDate = nextDueDate;
        }

        existingTask.updatedAt = new Date('2026-04-03T09:05:00.000Z');

        return Promise.resolve({
          id: existingTask.id,
          projectId: existingTask.projectId,
          title: existingTask.title,
          description: existingTask.description,
          acceptanceCriteria: null,
          notes: null,
          parentTaskId: null,
          statusId: existingTask.statusId,
          status: {
            id: existingTask.statusId,
            name: existingTask.statusName,
            position: existingTask.statusId === 'status-done' ? 3 : 1,
            isClosed: existingTask.statusId === 'status-done',
            color: existingTask.statusId === 'status-done' ? 'GREEN' : 'SLATE',
          },
          position: existingTask.position,
          assigneeId: existingTask.assigneeId,
          dueDate: existingTask.dueDate
            ? existingTask.dueDate.toISOString().slice(0, 10)
            : null,
          links: [],
          checklistItems: [],
          subtasks: [],
          createdAt: existingTask.createdAt.toISOString(),
          updatedAt: existingTask.updatedAt.toISOString(),
        });
      },
    );
    mockTasksService.updateTaskStatus.mockImplementation(
      (
        _currentUser,
        taskId: string,
        updateTaskStatusDto: UpdateTaskStatusDto,
      ) => {
        const existingTask = taskState[taskId];

        if (!existingTask) {
          throw new Error('Task not found');
        }

        const previousStatusName = existingTask.statusName;
        existingTask.statusId = updateTaskStatusDto.statusId;
        existingTask.statusName =
          updateTaskStatusDto.statusId === 'status-done' ? 'Done' : 'Todo';
        existingTask.updatedAt = new Date('2026-04-04T09:00:00.000Z');

        taskLogsState = [
          ...taskLogsState,
          {
            id: `log-${taskLogsState.length + 1}`,
            taskId,
            actorId: 'member-1',
            eventType: TaskLogEventType.STATUS_CHANGED,
            fieldName: 'status',
            oldValue: previousStatusName,
            newValue: existingTask.statusName,
            summary: 'Status changed',
            createdAt: new Date('2026-04-04T09:00:00.000Z'),
          },
        ];

        return Promise.resolve({
          id: existingTask.id,
          projectId: existingTask.projectId,
          title: existingTask.title,
          description: existingTask.description,
          acceptanceCriteria: null,
          notes: null,
          parentTaskId: null,
          statusId: existingTask.statusId,
          status: {
            id: existingTask.statusId,
            name: existingTask.statusName,
            position: existingTask.statusId === 'status-done' ? 3 : 1,
            isClosed: existingTask.statusId === 'status-done',
            color: existingTask.statusId === 'status-done' ? 'GREEN' : 'SLATE',
          },
          position: existingTask.position,
          assigneeId: existingTask.assigneeId,
          dueDate: existingTask.dueDate
            ? existingTask.dueDate.toISOString().slice(0, 10)
            : null,
          links: [],
          checklistItems: [],
          subtasks: [],
          createdAt: existingTask.createdAt.toISOString(),
          updatedAt: existingTask.updatedAt.toISOString(),
        });
      },
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TasksController, TaskLogsController],
      providers: [
        Reflector,
        TaskLogsService,
        JwtAuthGuard,
        ResourceAccessGuard,
        ResourceAuthorizationService,
        {
          provide: TasksService,
          useValue: mockTasksService,
        },
        {
          provide: TaskCommentsService,
          useValue: mockTaskCommentsService,
        },
        {
          provide: TaskAttachmentsService,
          useValue: mockTaskAttachmentsService,
        },
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
    await app?.close();
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
      page: 1,
      pageSize: 10,
      hasMore: false,
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
        statusId: 'status-done',
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
      page: 1,
      pageSize: 10,
      hasMore: false,
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
    statusId?: string;
    position?: number | null;
  };
}) {
  const controllerMethod =
    method === 'createTask'
      ? (Reflect.get(TasksController.prototype, 'createTask') as (
          ...args: unknown[]
        ) => unknown)
      : method === 'updateTask'
        ? (Reflect.get(TasksController.prototype, 'updateTask') as (
            ...args: unknown[]
          ) => unknown)
        : (Reflect.get(TasksController.prototype, 'updateTaskStatus') as (
            ...args: unknown[]
          ) => unknown);
  const executionContext = createExecutionContext(
    TasksController,
    controllerMethod,
    request,
  );

  await jwtAuthGuard.canActivate(executionContext);
  await resourceAccessGuard.canActivate(executionContext);

  if (method === 'createTask') {
    return TasksController.prototype.createTask.call(
      tasksController,
      request.user!,
      request.params.projectId as string,
      body as CreateTaskDto,
    );
  }

  if (method === 'updateTask') {
    return TasksController.prototype.updateTask.call(
      tasksController,
      request.user!,
      request.params.taskId as string,
      body as UpdateTaskDto,
    );
  }

  return TasksController.prototype.updateTaskStatus.call(
    tasksController,
    request.user!,
    request.params.taskId as string,
    body as UpdateTaskStatusDto,
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
    query: Record<string, never>,
  ) => Promise<unknown>;
  const executionContext = createExecutionContext(
    taskLogsController.constructor as typeof TaskLogsController,
    controllerHandler,
    request,
  );

  await jwtAuthGuard.canActivate(executionContext);
  await resourceAccessGuard.canActivate(executionContext);

  return taskLogsController.listTaskLogs(request.params.taskId as string, {});
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
  } as unknown as ExecutionContext;
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
