import {
  ArgumentsHost,
  type ExecutionContext,
  type INestApplication,
} from '@nestjs/common';
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
import { ProjectsController } from '../src/modules/projects/controller/projects.controller';
import { ProjectsService } from '../src/modules/projects/service/projects.service';

describe('ProjectsController (e2e)', () => {
  let app: INestApplication;
  let controller: ProjectsController;
  let jwtAuthGuard: JwtAuthGuard;
  let resourceAccessGuard: ResourceAccessGuard;

  const mockProjectsService = {
    getProjectDetail: jest.fn(),
    updateProject: jest.fn(),
    deleteProject: jest.fn(),
  };

  const mockAuthService = {
    authenticateAccessToken: jest.fn(),
  };

  const transactionClient = {
    project: {
      create: jest.fn(),
    },
    projectMember: {
      create: jest.fn(),
    },
  };

  const mockPrismaService = {
    project: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    projectMember: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    transactionClient.project.create.mockReset();
    transactionClient.projectMember.create.mockReset();
    mockPrismaService.project.findUnique.mockReset();
    mockPrismaService.project.findMany.mockReset();
    mockPrismaService.project.update.mockReset();
    mockPrismaService.project.delete.mockReset();
    mockPrismaService.projectMember.findUnique.mockReset();
    mockPrismaService.$transaction.mockReset();
    mockProjectsService.getProjectDetail.mockReset();
    mockProjectsService.updateProject.mockReset();
    mockProjectsService.deleteProject.mockReset();
    mockPrismaService.$transaction.mockImplementation(
      async (
        callback: (client: typeof transactionClient) => Promise<unknown>,
      ) => callback(transactionClient),
    );

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

        return Promise.resolve({
          id: 'admin-1',
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'ADMIN',
          emailVerifiedAt: '2026-04-01T00:00:00.000Z',
        });
      },
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        Reflector,
        JwtAuthGuard,
        ResourceAccessGuard,
        ResourceAuthorizationService,
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
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

    controller = moduleFixture.get(ProjectsController);
    jwtAuthGuard = moduleFixture.get(JwtAuthGuard);
    resourceAccessGuard = moduleFixture.get(ResourceAccessGuard);
  });

  afterEach(async () => {
    await app?.close();
  });

  it('returns a normalized 404 envelope when a guarded project does not exist', async () => {
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
      await executeProjectRoute({
        controller,
        jwtAuthGuard,
        resourceAccessGuard,
        method: 'getProjectDetail',
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

  it('returns 403 for non-owner update and delete attempts', async () => {
    mockPrismaService.project.findUnique.mockResolvedValue({
      id: 'project-1',
      ownerId: 'owner-1',
    });

    await expect(
      executeProjectRoute({
        controller,
        jwtAuthGuard,
        resourceAccessGuard,
        method: 'updateProject',
        request: createRequest({
          authorization: 'Bearer member-token',
          params: {
            projectId: 'project-1',
          },
        }),
        body: {
          name: 'Renamed Project',
        },
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'FORBIDDEN',
        message: 'Only the project owner can perform this action',
      },
    });

    await expect(
      executeProjectRoute({
        controller,
        jwtAuthGuard,
        resourceAccessGuard,
        method: 'deleteProject',
        request: createRequest({
          authorization: 'Bearer member-token',
          params: {
            projectId: 'project-1',
          },
        }),
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'FORBIDDEN',
        message: 'Only the project owner can perform this action',
      },
    });
  });

  it('allows owners to update projects', async () => {
    mockPrismaService.project.findUnique.mockResolvedValue({
      id: 'project-1',
      ownerId: 'owner-1',
    });
    mockProjectsService.updateProject.mockResolvedValue({
      id: 'project-1',
      name: 'Launch Website',
      description: null,
      role: 'OWNER',
      statuses: [],
    });

    await expect(
      executeProjectRoute({
        controller,
        jwtAuthGuard,
        resourceAccessGuard,
        method: 'updateProject',
        request: createRequest({
          authorization: 'Bearer owner-token',
          params: {
            projectId: 'project-1',
          },
        }),
        body: {
          description: null,
        },
      }),
    ).resolves.toEqual({
      id: 'project-1',
      name: 'Launch Website',
      description: null,
      role: 'OWNER',
      statuses: [],
    });
  });

  it('allows owners to delete projects', async () => {
    mockPrismaService.project.findUnique.mockResolvedValue({
      id: 'project-1',
      ownerId: 'owner-1',
    });
    mockProjectsService.deleteProject.mockResolvedValue({
      message: 'Project deleted successfully',
    });

    await expect(
      executeProjectRoute({
        controller,
        jwtAuthGuard,
        resourceAccessGuard,
        method: 'deleteProject',
        request: createRequest({
          authorization: 'Bearer owner-token',
          params: {
            projectId: 'project-1',
          },
        }),
      }),
    ).resolves.toEqual({
      message: 'Project deleted successfully',
    });
  });
});

async function executeProjectRoute({
  controller,
  jwtAuthGuard,
  resourceAccessGuard,
  method,
  request,
  body,
}: {
  controller: ProjectsController;
  jwtAuthGuard: JwtAuthGuard;
  resourceAccessGuard: ResourceAccessGuard;
  method: 'getProjectDetail' | 'updateProject' | 'deleteProject';
  request: AuthenticatedRequest;
  body?: {
    name?: string;
    description?: string | null;
  };
}) {
  const controllerMethod =
    method === 'getProjectDetail'
      ? (Reflect.get(ProjectsController.prototype, 'getProjectDetail') as (
          ...args: unknown[]
        ) => unknown)
      : method === 'updateProject'
        ? (Reflect.get(ProjectsController.prototype, 'updateProject') as (
            ...args: unknown[]
          ) => unknown)
        : (Reflect.get(ProjectsController.prototype, 'deleteProject') as (
            ...args: unknown[]
          ) => unknown);
  const executionContext = createExecutionContext(
    ProjectsController,
    controllerMethod,
    request,
  );

  await jwtAuthGuard.canActivate(executionContext);
  await resourceAccessGuard.canActivate(executionContext);

  if (method === 'getProjectDetail') {
    return ProjectsController.prototype.getProjectDetail.call(
      controller,
      request.params.projectId,
    );
  }

  if (method === 'updateProject') {
    return ProjectsController.prototype.updateProject.call(
      controller,
      request.user,
      request.params.projectId,
      body,
    );
  }

  return ProjectsController.prototype.deleteProject.call(
    controller,
    request.params.projectId,
  );
}

function createExecutionContext(
  controllerClass: typeof ProjectsController,
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
  } as unknown as ArgumentsHost;
}
