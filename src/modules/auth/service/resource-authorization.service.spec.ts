import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ResourceAuthorizationService } from './resource-authorization.service';
import type { PrismaService } from '../../../database/prisma.service';

describe('ResourceAuthorizationService', () => {
  const adminUser = {
    id: 'admin-1',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'ADMIN' as const,
    emailVerifiedAt: '2026-04-01T00:00:00.000Z',
  };

  const ownerUser = {
    id: 'owner-1',
    name: 'Owner User',
    email: 'owner@example.com',
    role: 'MEMBER' as const,
    emailVerifiedAt: '2026-04-01T00:00:00.000Z',
  };

  const memberUser = {
    id: 'member-1',
    name: 'Member User',
    email: 'member@example.com',
    role: 'MEMBER' as const,
    emailVerifiedAt: '2026-04-01T00:00:00.000Z',
  };

  const outsiderUser = {
    id: 'outsider-1',
    name: 'Outsider User',
    email: 'outsider@example.com',
    role: 'MEMBER' as const,
    emailVerifiedAt: '2026-04-01T00:00:00.000Z',
  };

  const mockPrismaService = {
    project: {
      findUnique: jest.fn(),
    },
    projectMember: {
      findUnique: jest.fn(),
    },
    task: {
      findUnique: jest.fn(),
    },
  } as unknown as PrismaService & {
    project: {
      findUnique: jest.Mock;
    };
    projectMember: {
      findUnique: jest.Mock;
    };
    task: {
      findUnique: jest.Mock;
    };
  };

  const resourceAuthorizationService = new ResourceAuthorizationService(
    mockPrismaService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows admin access to any project', async () => {
    mockPrismaService.project.findUnique.mockResolvedValue({
      id: 'project-1',
      ownerId: 'owner-1',
    });

    await expect(
      resourceAuthorizationService.assertProjectAccess('project-1', adminUser, {
        ownerOnly: false,
      }),
    ).resolves.toEqual({
      projectId: 'project-1',
      ownerId: 'owner-1',
    });
  });

  it('allows owner access to project mutations', async () => {
    mockPrismaService.project.findUnique.mockResolvedValue({
      id: 'project-1',
      ownerId: 'owner-1',
    });

    await expect(
      resourceAuthorizationService.assertProjectAccess('project-1', ownerUser, {
        ownerOnly: true,
      }),
    ).resolves.toEqual({
      projectId: 'project-1',
      ownerId: 'owner-1',
    });
  });

  it('allows project members to access non-owner project routes', async () => {
    mockPrismaService.project.findUnique.mockResolvedValue({
      id: 'project-1',
      ownerId: 'owner-1',
    });
    mockPrismaService.projectMember.findUnique.mockResolvedValue({
      id: 'membership-1',
    });

    await expect(
      resourceAuthorizationService.assertProjectAccess(
        'project-1',
        memberUser,
        {
          ownerOnly: false,
        },
      ),
    ).resolves.toEqual({
      projectId: 'project-1',
      ownerId: 'owner-1',
    });
  });

  it('rejects non-members from project access', async () => {
    mockPrismaService.project.findUnique.mockResolvedValue({
      id: 'project-1',
      ownerId: 'owner-1',
    });
    mockPrismaService.projectMember.findUnique.mockResolvedValue(null);

    await expect(
      resourceAuthorizationService.assertProjectAccess(
        'project-1',
        outsiderUser,
        {
          ownerOnly: false,
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects non-owner members from owner-only project mutations', async () => {
    mockPrismaService.project.findUnique.mockResolvedValue({
      id: 'project-1',
      ownerId: 'owner-1',
    });

    await expect(
      resourceAuthorizationService.assertProjectAccess(
        'project-1',
        memberUser,
        {
          ownerOnly: true,
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects missing projects with 404', async () => {
    mockPrismaService.project.findUnique.mockResolvedValue(null);

    await expect(
      resourceAuthorizationService.assertProjectAccess(
        'missing-project',
        memberUser,
        {
          ownerOnly: false,
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('allows task access through project membership', async () => {
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
      resourceAuthorizationService.assertTaskAccess('task-1', memberUser),
    ).resolves.toEqual({
      taskId: 'task-1',
      projectId: 'project-1',
    });
  });

  it('rejects non-members from task access', async () => {
    mockPrismaService.task.findUnique.mockResolvedValue({
      id: 'task-1',
      projectId: 'project-1',
      project: {
        ownerId: 'owner-1',
      },
    });
    mockPrismaService.projectMember.findUnique.mockResolvedValue(null);

    await expect(
      resourceAuthorizationService.assertTaskAccess('task-1', outsiderUser),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects missing tasks with 404', async () => {
    mockPrismaService.task.findUnique.mockResolvedValue(null);

    await expect(
      resourceAuthorizationService.assertTaskAccess('missing-task', memberUser),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
