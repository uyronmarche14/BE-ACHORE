import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  type ExecutionContext,
  type INestApplication,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import { configureApplication } from '../src/common/bootstrap/configure-application';
import {
  RequireProjectAccess,
  RequireTaskAccess,
} from '../src/modules/auth/decorators/resource-access.decorator';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { ResourceAccessGuard } from '../src/modules/auth/guards/resource-access.guard';
import { AuthService } from '../src/modules/auth/service/auth.service';
import { ResourceAuthorizationService } from '../src/modules/auth/service/resource-authorization.service';
import type { AuthenticatedRequest } from '../src/modules/auth/types/authenticated-request.type';
import { PrismaService } from '../src/database/prisma.service';

@Controller('authz-probe')
@UseGuards(JwtAuthGuard, ResourceAccessGuard)
class AuthorizationProbeController {
  @Get('projects/:projectId')
  @RequireProjectAccess()
  getProject(@Req() request: AuthenticatedRequest) {
    return {
      projectId: request.authorizedProject?.projectId ?? null,
    };
  }

  @Post('projects/:projectId')
  @RequireProjectAccess({ ownerOnly: true })
  updateProject(@Req() request: AuthenticatedRequest) {
    return {
      projectId: request.authorizedProject?.projectId ?? null,
      mutation: 'updated',
    };
  }

  @Get('tasks/:taskId')
  @RequireTaskAccess()
  getTask(@Req() request: AuthenticatedRequest) {
    return {
      taskId: request.authorizedTask?.taskId ?? null,
      projectId: request.authorizedTask?.projectId ?? null,
    };
  }
}

describe('Authorization guards (e2e)', () => {
  let app: INestApplication;
  let controller: AuthorizationProbeController;
  let jwtAuthGuard: JwtAuthGuard;
  let resourceAccessGuard: ResourceAccessGuard;
  let mockAuthService: {
    authenticateAccessToken: jest.Mock;
  };
  let mockPrismaService: {
    project: { findUnique: jest.Mock };
    projectMember: { findUnique: jest.Mock };
    task: { findUnique: jest.Mock };
  };

  beforeEach(async () => {
    mockAuthService = {
      authenticateAccessToken: jest.fn(),
    };
    mockPrismaService = {
      project: {
        findUnique: jest.fn(),
      },
      projectMember: {
        findUnique: jest.fn(),
      },
      task: {
        findUnique: jest.fn(),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthorizationProbeController],
      providers: [
        Reflector,
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

    controller = moduleFixture.get(AuthorizationProbeController);
    jwtAuthGuard = moduleFixture.get(JwtAuthGuard);
    resourceAccessGuard = moduleFixture.get(ResourceAccessGuard);
  });

  it('rejects missing access tokens with 401', async () => {
    await expect(
      executeGuardedRoute({
        controller,
        jwtAuthGuard,
        resourceAccessGuard,
        method: 'getProject',
        params: {
          projectId: 'project-1',
        },
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns 403 for authenticated users without project membership', async () => {
    mockAuthService.authenticateAccessToken.mockResolvedValue({
      id: 'member-1',
      name: 'Member User',
      email: 'member@example.com',
      role: 'MEMBER',
      emailVerifiedAt: '2026-04-01T00:00:00.000Z',
    });
    mockPrismaService.project.findUnique.mockResolvedValue({
      id: 'project-1',
      ownerId: 'owner-1',
    });
    mockPrismaService.projectMember.findUnique.mockResolvedValue(null);

    await expect(
      executeGuardedRoute({
        controller,
        jwtAuthGuard,
        resourceAccessGuard,
        method: 'getProject',
        params: {
          projectId: 'project-1',
        },
        authorization: 'Bearer member-token',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns 404 for missing guarded projects', async () => {
    mockAuthService.authenticateAccessToken.mockResolvedValue({
      id: 'member-1',
      name: 'Member User',
      email: 'member@example.com',
      role: 'MEMBER',
      emailVerifiedAt: '2026-04-01T00:00:00.000Z',
    });
    mockPrismaService.project.findUnique.mockResolvedValue(null);

    await expect(
      executeGuardedRoute({
        controller,
        jwtAuthGuard,
        resourceAccessGuard,
        method: 'getProject',
        params: {
          projectId: 'missing-project',
        },
        authorization: 'Bearer member-token',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns 403 for non-owner project mutations', async () => {
    mockAuthService.authenticateAccessToken.mockResolvedValue({
      id: 'member-1',
      name: 'Member User',
      email: 'member@example.com',
      role: 'MEMBER',
      emailVerifiedAt: '2026-04-01T00:00:00.000Z',
    });
    mockPrismaService.project.findUnique.mockResolvedValue({
      id: 'project-1',
      ownerId: 'owner-1',
    });

    await expect(
      executeGuardedRoute({
        controller,
        jwtAuthGuard,
        resourceAccessGuard,
        method: 'updateProject',
        params: {
          projectId: 'project-1',
        },
        authorization: 'Bearer member-token',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows project members through guarded read routes', async () => {
    mockAuthService.authenticateAccessToken.mockResolvedValue({
      id: 'member-1',
      name: 'Member User',
      email: 'member@example.com',
      role: 'MEMBER',
      emailVerifiedAt: '2026-04-01T00:00:00.000Z',
    });
    mockPrismaService.project.findUnique.mockResolvedValue({
      id: 'project-1',
      ownerId: 'owner-1',
    });
    mockPrismaService.projectMember.findUnique.mockResolvedValue({
      id: 'membership-1',
    });

    await expect(
      executeGuardedRoute({
        controller,
        jwtAuthGuard,
        resourceAccessGuard,
        method: 'getProject',
        params: {
          projectId: 'project-1',
        },
        authorization: 'Bearer member-token',
      }),
    ).resolves.toEqual({
      projectId: 'project-1',
    });
  });

  it('allows task access through project membership', async () => {
    mockAuthService.authenticateAccessToken.mockResolvedValue({
      id: 'member-1',
      name: 'Member User',
      email: 'member@example.com',
      role: 'MEMBER',
      emailVerifiedAt: '2026-04-01T00:00:00.000Z',
    });
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

    await expect(
      executeGuardedRoute({
        controller,
        jwtAuthGuard,
        resourceAccessGuard,
        method: 'getTask',
        params: {
          taskId: 'task-1',
        },
        authorization: 'Bearer member-token',
      }),
    ).resolves.toEqual({
      taskId: 'task-1',
      projectId: 'project-1',
    });
  });

  afterEach(async () => {
    await app.close();
  });
});

async function executeGuardedRoute({
  controller,
  jwtAuthGuard,
  resourceAccessGuard,
  method,
  params,
  authorization,
}: {
  controller: AuthorizationProbeController;
  jwtAuthGuard: JwtAuthGuard;
  resourceAccessGuard: ResourceAccessGuard;
  method: 'getProject' | 'updateProject' | 'getTask';
  params: Record<string, string>;
  authorization?: string;
}) {
  const request = {
    params,
    headers: authorization
      ? {
          authorization,
        }
      : {},
  } as AuthenticatedRequest;

  const controllerMethod =
    method === 'getProject'
      ? (Reflect.get(AuthorizationProbeController.prototype, 'getProject') as (
          ...args: unknown[]
        ) => unknown)
      : method === 'updateProject'
        ? (Reflect.get(
            AuthorizationProbeController.prototype,
            'updateProject',
          ) as (...args: unknown[]) => unknown)
        : (Reflect.get(AuthorizationProbeController.prototype, 'getTask') as (
            ...args: unknown[]
          ) => unknown);
  const executionContext = createExecutionContext(
    AuthorizationProbeController,
    controllerMethod,
    request,
  );

  await jwtAuthGuard.canActivate(executionContext);
  await resourceAccessGuard.canActivate(executionContext);

  return controllerMethod.call(controller, request);
}

function createExecutionContext(
  controllerClass: typeof AuthorizationProbeController,
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
