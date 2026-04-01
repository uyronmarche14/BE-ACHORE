import {
  ArgumentsHost,
  type ExecutionContext,
  type INestApplication,
} from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { Reflector } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import type { RequestWithContext } from '../src/common/types/request-context.type';
import { configureApplication } from '../src/common/bootstrap/configure-application';
import { PrismaService } from '../src/database/prisma.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { ResourceAccessGuard } from '../src/modules/auth/guards/resource-access.guard';
import { AuthService } from '../src/modules/auth/service/auth.service';
import { ResourceAuthorizationService } from '../src/modules/auth/service/resource-authorization.service';
import type { AuthenticatedRequest } from '../src/modules/auth/types/authenticated-request.type';
import { TasksController } from '../src/modules/tasks/controller/tasks.controller';
import { TasksService } from '../src/modules/tasks/service/tasks.service';

describe('TasksController (e2e)', () => {
  let app: INestApplication;
  let controller: TasksController;
  let jwtAuthGuard: JwtAuthGuard;
  let resourceAccessGuard: ResourceAccessGuard;

  const mockAuthService = {
    authenticateAccessToken: jest.fn(),
  };

  const mockPrismaService = {
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
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrismaService.project.findUnique.mockReset();
    mockPrismaService.projectMember.findUnique.mockReset();
    mockPrismaService.task.create.mockReset();
    mockPrismaService.task.findMany.mockReset();
    mockPrismaService.task.findUnique.mockReset();
    mockPrismaService.task.update.mockReset();
    mockPrismaService.task.delete.mockReset();

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

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        Reflector,
        TasksService,
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

    controller = moduleFixture.get(TasksController);
    jwtAuthGuard = moduleFixture.get(JwtAuthGuard);
    resourceAccessGuard = moduleFixture.get(ResourceAccessGuard);
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 401 for unauthenticated task requests', async () => {
    await expect(
      executeTaskRoute({
        controller,
        jwtAuthGuard,
        resourceAccessGuard,
        method: 'getTask',
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

  it('returns a normalized 404 envelope when a guarded project does not exist during board task loading', async () => {
    mockPrismaService.project.findUnique.mockResolvedValue(null);

    const request = createRequest({
      authorization: 'Bearer member-token',
      params: {
        projectId: 'missing-project',
      },
    });
    const response = createResponse();
    const exceptionFilter = new GlobalExceptionFilter();

    try {
      await executeTaskRoute({
        controller,
        jwtAuthGuard,
        resourceAccessGuard,
        method: 'listProjectTasks',
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
        message: 'Project not found',
        details: null,
      },
    });
  });

  it('returns 403 when a user tries to load tasks from a project outside their scope', async () => {
    mockPrismaService.project.findUnique.mockResolvedValue({
      id: 'project-1',
      ownerId: 'owner-1',
    });
    mockPrismaService.projectMember.findUnique.mockResolvedValue(null);

    await expect(
      executeTaskRoute({
        controller,
        jwtAuthGuard,
        resourceAccessGuard,
        method: 'listProjectTasks',
        request: createRequest({
          authorization: 'Bearer outsider-token',
          params: {
            projectId: 'project-1',
          },
        }),
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'FORBIDDEN',
        message: 'You do not have access to this project',
      },
    });
  });

  it('returns grouped task data for an accessible project member', async () => {
    mockPrismaService.project.findUnique.mockResolvedValue({
      id: 'project-1',
      ownerId: 'owner-1',
    });
    mockPrismaService.projectMember.findUnique.mockResolvedValue({
      id: 'membership-1',
    });
    mockPrismaService.task.findMany.mockResolvedValue([
      {
        id: 'task-done',
        projectId: 'project-1',
        title: 'Publish smoke notes',
        description: null,
        status: TaskStatus.DONE,
        position: null,
        assigneeId: null,
        dueDate: null,
        createdAt: new Date('2026-04-02T09:00:00.000Z'),
        updatedAt: new Date('2026-04-02T09:00:00.000Z'),
      },
      {
        id: 'task-todo',
        projectId: 'project-1',
        title: 'Draft API envelope',
        description: null,
        status: TaskStatus.TODO,
        position: 1,
        assigneeId: null,
        dueDate: null,
        createdAt: new Date('2026-04-01T09:00:00.000Z'),
        updatedAt: new Date('2026-04-01T09:00:00.000Z'),
      },
    ]);

    await expect(
      executeTaskRoute({
        controller,
        jwtAuthGuard,
        resourceAccessGuard,
        method: 'listProjectTasks',
        request: createRequest({
          authorization: 'Bearer member-token',
          params: {
            projectId: 'project-1',
          },
        }),
      }),
    ).resolves.toEqual({
      taskGroups: {
        TODO: [
          {
            id: 'task-todo',
            projectId: 'project-1',
            title: 'Draft API envelope',
            description: null,
            status: TaskStatus.TODO,
            position: 1,
            assigneeId: null,
            dueDate: null,
            createdAt: '2026-04-01T09:00:00.000Z',
            updatedAt: '2026-04-01T09:00:00.000Z',
          },
        ],
        IN_PROGRESS: [],
        DONE: [
          {
            id: 'task-done',
            projectId: 'project-1',
            title: 'Publish smoke notes',
            description: null,
            status: TaskStatus.DONE,
            position: null,
            assigneeId: null,
            dueDate: null,
            createdAt: '2026-04-02T09:00:00.000Z',
            updatedAt: '2026-04-02T09:00:00.000Z',
          },
        ],
      },
    });
  });

  it('returns a normalized 404 envelope when a guarded task does not exist', async () => {
    mockPrismaService.task.findUnique.mockResolvedValue(null);

    const request = createRequest({
      authorization: 'Bearer member-token',
      params: {
        taskId: 'missing-task',
      },
    });
    const response = createResponse();
    const exceptionFilter = new GlobalExceptionFilter();

    try {
      await executeTaskRoute({
        controller,
        jwtAuthGuard,
        resourceAccessGuard,
        method: 'getTask',
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

  it('returns 403 when a user tries to access a task outside their project scope', async () => {
    mockPrismaService.task.findUnique.mockResolvedValue({
      id: 'task-1',
      projectId: 'project-1',
      project: {
        ownerId: 'owner-1',
      },
    });
    mockPrismaService.projectMember.findUnique.mockResolvedValue(null);

    await expect(
      executeTaskRoute({
        controller,
        jwtAuthGuard,
        resourceAccessGuard,
        method: 'getTask',
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

  it('allows members to create, update, and delete tasks inside accessible projects', async () => {
    mockPrismaService.project.findUnique.mockResolvedValue({
      id: 'project-1',
      ownerId: 'owner-1',
    });
    mockPrismaService.projectMember.findUnique
      .mockResolvedValueOnce({
        id: 'membership-1',
      })
      .mockResolvedValueOnce({
        id: 'membership-1',
      })
      .mockResolvedValueOnce({
        id: 'membership-2',
      })
      .mockResolvedValueOnce({
        id: 'membership-1',
      });
    mockPrismaService.task.create.mockResolvedValue({
      id: 'task-1',
      projectId: 'project-1',
      title: 'Ship launch checklist',
      description: null,
      status: TaskStatus.TODO,
      position: null,
      assigneeId: null,
      dueDate: null,
      createdAt: new Date('2026-04-01T09:00:00.000Z'),
      updatedAt: new Date('2026-04-01T09:00:00.000Z'),
    });
    mockPrismaService.task.findUnique
      .mockResolvedValueOnce({
        id: 'task-1',
        projectId: 'project-1',
        project: {
          ownerId: 'owner-1',
        },
      })
      .mockResolvedValueOnce({
        projectId: 'project-1',
      })
      .mockResolvedValueOnce({
        id: 'task-1',
        projectId: 'project-1',
        project: {
          ownerId: 'owner-1',
        },
      });
    mockPrismaService.task.update.mockResolvedValue({
      id: 'task-1',
      projectId: 'project-1',
      title: 'Review release notes',
      description: null,
      status: TaskStatus.TODO,
      position: null,
      assigneeId: 'member-1',
      dueDate: null,
      createdAt: new Date('2026-04-01T09:00:00.000Z'),
      updatedAt: new Date('2026-04-02T11:00:00.000Z'),
    });
    mockPrismaService.task.delete.mockResolvedValue({
      id: 'task-1',
    });

    await expect(
      executeTaskRoute({
        controller,
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
      }),
    ).resolves.toMatchObject({
      id: 'task-1',
      projectId: 'project-1',
      title: 'Ship launch checklist',
      status: TaskStatus.TODO,
    });

    await expect(
      executeTaskRoute({
        controller,
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
          title: 'Review release notes',
          assigneeId: 'member-1',
        },
      }),
    ).resolves.toMatchObject({
      id: 'task-1',
      projectId: 'project-1',
      title: 'Review release notes',
      assigneeId: 'member-1',
    });

    await expect(
      executeTaskRoute({
        controller,
        jwtAuthGuard,
        resourceAccessGuard,
        method: 'deleteTask',
        request: createRequest({
          authorization: 'Bearer member-token',
          params: {
            taskId: 'task-1',
          },
        }),
      }),
    ).resolves.toEqual({
      message: 'Task deleted successfully',
    });
  });

  it('allows members to patch task status inside accessible projects', async () => {
    mockPrismaService.task.findUnique.mockResolvedValue({
      id: 'task-1',
      projectId: 'project-1',
      project: {
        ownerId: 'owner-1',
      },
    });
    mockPrismaService.projectMember.findUnique.mockResolvedValue({
      id: 'membership-1',
    });
    mockPrismaService.task.update.mockResolvedValue({
      id: 'task-1',
      projectId: 'project-1',
      title: 'Ship launch checklist',
      description: null,
      status: TaskStatus.DONE,
      position: null,
      assigneeId: null,
      dueDate: null,
      createdAt: new Date('2026-04-01T09:00:00.000Z'),
      updatedAt: new Date('2026-04-06T09:00:00.000Z'),
    });

    await expect(
      executeTaskRoute({
        controller,
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
      }),
    ).resolves.toMatchObject({
      id: 'task-1',
      projectId: 'project-1',
      status: TaskStatus.DONE,
      position: null,
    });
  });

  it('allows admins to bypass project membership when loading project tasks', async () => {
    mockPrismaService.project.findUnique.mockResolvedValue({
      id: 'project-1',
      ownerId: 'owner-1',
    });
    mockPrismaService.task.findMany.mockResolvedValue([
      {
        id: 'task-1',
        projectId: 'project-1',
        title: 'Ship launch checklist',
        description: null,
        status: TaskStatus.TODO,
        position: null,
        assigneeId: null,
        dueDate: null,
        createdAt: new Date('2026-04-01T09:00:00.000Z'),
        updatedAt: new Date('2026-04-01T09:00:00.000Z'),
      },
    ]);

    await expect(
      executeTaskRoute({
        controller,
        jwtAuthGuard,
        resourceAccessGuard,
        method: 'listProjectTasks',
        request: createRequest({
          authorization: 'Bearer admin-token',
          params: {
            projectId: 'project-1',
          },
        }),
      }),
    ).resolves.toMatchObject({
      taskGroups: {
        TODO: [
          {
            id: 'task-1',
            projectId: 'project-1',
            title: 'Ship launch checklist',
          },
        ],
        IN_PROGRESS: [],
        DONE: [],
      },
    });

    expect(mockPrismaService.projectMember.findUnique).not.toHaveBeenCalled();
  });

  it('allows admins to bypass project membership when loading a single task', async () => {
    mockPrismaService.task.findUnique
      .mockResolvedValueOnce({
        id: 'task-1',
        projectId: 'project-1',
        project: {
          ownerId: 'owner-1',
        },
      })
      .mockResolvedValueOnce({
        id: 'task-1',
        projectId: 'project-1',
        title: 'Ship launch checklist',
        description: null,
        status: TaskStatus.TODO,
        position: null,
        assigneeId: null,
        dueDate: null,
        createdAt: new Date('2026-04-01T09:00:00.000Z'),
        updatedAt: new Date('2026-04-01T09:00:00.000Z'),
      });

    await expect(
      executeTaskRoute({
        controller,
        jwtAuthGuard,
        resourceAccessGuard,
        method: 'getTask',
        request: createRequest({
          authorization: 'Bearer admin-token',
          params: {
            taskId: 'task-1',
          },
        }),
      }),
    ).resolves.toMatchObject({
      id: 'task-1',
      projectId: 'project-1',
      title: 'Ship launch checklist',
    });

    expect(mockPrismaService.projectMember.findUnique).not.toHaveBeenCalled();
  });
});

async function executeTaskRoute({
  controller,
  jwtAuthGuard,
  resourceAccessGuard,
  method,
  request,
  body,
}: {
  controller: TasksController;
  jwtAuthGuard: JwtAuthGuard;
  resourceAccessGuard: ResourceAccessGuard;
  method:
    | 'listProjectTasks'
    | 'createTask'
    | 'getTask'
    | 'updateTask'
    | 'updateTaskStatus'
    | 'deleteTask';
  request: AuthenticatedRequest;
  body?: {
    title?: string;
    description?: string | null;
    assigneeId?: string | null;
    dueDate?: string | null;
    status?: TaskStatus;
    position?: number | null;
  };
}) {
  const controllerMethod = controller[method];
  const executionContext = createExecutionContext(
    controller.constructor as typeof TasksController,
    controllerMethod as (...args: unknown[]) => unknown,
    request,
  );

  await jwtAuthGuard.canActivate(executionContext);
  await resourceAccessGuard.canActivate(executionContext);

  if (method === 'listProjectTasks') {
    return controllerMethod.call(controller, request.params.projectId);
  }

  if (method === 'createTask') {
    return controllerMethod.call(
      controller,
      request.user,
      request.params.projectId,
      body,
    );
  }

  if (method === 'getTask') {
    return controllerMethod.call(controller, request.params.taskId);
  }

  if (method === 'updateTask') {
    return controllerMethod.call(
      controller,
      request.user,
      request.params.taskId,
      body,
    );
  }

  if (method === 'updateTaskStatus') {
    return controllerMethod.call(
      controller,
      request.user,
      request.params.taskId,
      body,
    );
  }

  return controllerMethod.call(controller, request.params.taskId) as ReturnType<
    TasksController['deleteTask']
  >;
}

function createExecutionContext(
  controllerClass: typeof TasksController,
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
  request: RequestWithContext,
  response: {
    status: jest.Mock;
    json: jest.Mock;
  },
): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
      getNext: () => undefined,
    }),
  } as ArgumentsHost;
}
