/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { NotFoundException } from '@nestjs/common';
import { ProjectMemberRole, TaskStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
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

  const adminUser = {
    id: 'admin-1',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'ADMIN' as const,
    emailVerifiedAt: '2026-04-01T00:00:00.000Z',
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
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    projectMember: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService & {
    project: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    projectMember: {
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  let projectsService: ProjectsService;

  beforeEach(() => {
    jest.clearAllMocks();
    transactionClient.project.create.mockReset();
    transactionClient.projectMember.create.mockReset();
    mockPrismaService.project.findMany.mockReset();
    mockPrismaService.project.findUnique.mockReset();
    mockPrismaService.project.update.mockReset();
    mockPrismaService.project.delete.mockReset();
    mockPrismaService.$transaction.mockReset();
    mockPrismaService.$transaction.mockImplementation(
      async (
        callback: (client: typeof transactionClient) => Promise<unknown>,
      ) => callback(transactionClient),
    );

    projectsService = new ProjectsService(mockPrismaService);
  });

  it('creates a project and owner membership in one transaction', async () => {
    transactionClient.project.create.mockResolvedValue({
      id: 'project-1',
      name: 'Launch Website',
      description: 'Track launch tasks',
      ownerId: 'owner-1',
      tasks: [],
    });
    transactionClient.projectMember.create.mockResolvedValue({
      id: 'membership-1',
    });

    const result = await projectsService.createProject(ownerUser, {
      name: 'Launch Website',
      description: 'Track launch tasks',
    });

    expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    expect(transactionClient.project.create).toHaveBeenCalledWith({
      data: {
        name: 'Launch Website',
        description: 'Track launch tasks',
        ownerId: 'owner-1',
      },
      select: expect.any(Object),
    });
    expect(transactionClient.projectMember.create).toHaveBeenCalledWith({
      data: {
        projectId: 'project-1',
        userId: 'owner-1',
        role: ProjectMemberRole.OWNER,
      },
    });
    expect(result).toEqual({
      id: 'project-1',
      name: 'Launch Website',
      description: 'Track launch tasks',
      role: ProjectMemberRole.OWNER,
      taskCounts: {
        TODO: 0,
        IN_PROGRESS: 0,
        DONE: 0,
      },
    });
  });

  it('lists only accessible projects for a member user', async () => {
    mockPrismaService.project.findMany.mockResolvedValue([
      {
        id: 'project-1',
        name: 'Owned Project',
        description: 'Owned description',
        ownerId: 'member-1',
        tasks: [{ status: TaskStatus.TODO }, { status: TaskStatus.DONE }],
      },
      {
        id: 'project-2',
        name: 'Joined Project',
        description: null,
        ownerId: 'owner-1',
        tasks: [{ status: TaskStatus.IN_PROGRESS }],
      },
    ]);

    const result = await projectsService.listProjects(memberUser);

    expect(mockPrismaService.project.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          {
            ownerId: 'member-1',
          },
          {
            members: {
              some: {
                userId: 'member-1',
              },
            },
          },
        ],
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: expect.any(Object),
    });
    expect(result).toEqual({
      items: [
        {
          id: 'project-1',
          name: 'Owned Project',
          description: 'Owned description',
          role: ProjectMemberRole.OWNER,
          taskCounts: {
            TODO: 1,
            IN_PROGRESS: 0,
            DONE: 1,
          },
        },
        {
          id: 'project-2',
          name: 'Joined Project',
          description: null,
          role: ProjectMemberRole.MEMBER,
          taskCounts: {
            TODO: 0,
            IN_PROGRESS: 1,
            DONE: 0,
          },
        },
      ],
    });
  });

  it('lists all projects for an admin user and preserves documented role output', async () => {
    mockPrismaService.project.findMany.mockResolvedValue([
      {
        id: 'project-1',
        name: 'Admin Visible Project',
        description: null,
        ownerId: 'owner-1',
        tasks: [],
      },
    ]);

    const result = await projectsService.listProjects(adminUser);

    expect(mockPrismaService.project.findMany).toHaveBeenCalledWith({
      where: undefined,
      orderBy: {
        updatedAt: 'desc',
      },
      select: expect.any(Object),
    });
    expect(result).toEqual({
      items: [
        {
          id: 'project-1',
          name: 'Admin Visible Project',
          description: null,
          role: ProjectMemberRole.MEMBER,
          taskCounts: {
            TODO: 0,
            IN_PROGRESS: 0,
            DONE: 0,
          },
        },
      ],
    });
  });

  it('returns grouped project detail with sorted members and board-ready task groups', async () => {
    mockPrismaService.project.findUnique.mockResolvedValue({
      id: 'project-1',
      name: 'Launch Website',
      description: 'Track launch tasks',
      members: [
        {
          role: ProjectMemberRole.MEMBER,
          user: {
            id: 'member-1',
            name: 'Member User',
          },
        },
        {
          role: ProjectMemberRole.OWNER,
          user: {
            id: 'owner-1',
            name: 'Owner User',
          },
        },
      ],
      tasks: [
        {
          id: 'task-3',
          projectId: 'project-1',
          title: 'Finalize QA',
          description: null,
          status: TaskStatus.TODO,
          position: null,
          assigneeId: null,
          dueDate: null,
          createdAt: new Date('2026-04-03T09:00:00.000Z'),
          updatedAt: new Date('2026-04-03T09:00:00.000Z'),
        },
        {
          id: 'task-2',
          projectId: 'project-1',
          title: 'Ship assets',
          description: 'Coordinate release files',
          status: TaskStatus.IN_PROGRESS,
          position: 2,
          assigneeId: 'member-1',
          dueDate: new Date('2026-04-10T00:00:00.000Z'),
          createdAt: new Date('2026-04-02T09:00:00.000Z'),
          updatedAt: new Date('2026-04-02T10:00:00.000Z'),
        },
        {
          id: 'task-1',
          projectId: 'project-1',
          title: 'Draft launch checklist',
          description: 'Capture release requirements',
          status: TaskStatus.TODO,
          position: 1,
          assigneeId: null,
          dueDate: new Date('2026-04-08T00:00:00.000Z'),
          createdAt: new Date('2026-04-01T09:00:00.000Z'),
          updatedAt: new Date('2026-04-01T10:00:00.000Z'),
        },
      ],
    });

    const result = await projectsService.getProjectDetail('project-1');

    expect(result).toEqual({
      id: 'project-1',
      name: 'Launch Website',
      description: 'Track launch tasks',
      members: [
        {
          id: 'owner-1',
          name: 'Owner User',
          role: ProjectMemberRole.OWNER,
        },
        {
          id: 'member-1',
          name: 'Member User',
          role: ProjectMemberRole.MEMBER,
        },
      ],
      taskGroups: {
        TODO: [
          {
            id: 'task-1',
            projectId: 'project-1',
            title: 'Draft launch checklist',
            description: 'Capture release requirements',
            status: TaskStatus.TODO,
            position: 1,
            assigneeId: null,
            dueDate: '2026-04-08',
            createdAt: '2026-04-01T09:00:00.000Z',
            updatedAt: '2026-04-01T10:00:00.000Z',
          },
          {
            id: 'task-3',
            projectId: 'project-1',
            title: 'Finalize QA',
            description: null,
            status: TaskStatus.TODO,
            position: null,
            assigneeId: null,
            dueDate: null,
            createdAt: '2026-04-03T09:00:00.000Z',
            updatedAt: '2026-04-03T09:00:00.000Z',
          },
        ],
        IN_PROGRESS: [
          {
            id: 'task-2',
            projectId: 'project-1',
            title: 'Ship assets',
            description: 'Coordinate release files',
            status: TaskStatus.IN_PROGRESS,
            position: 2,
            assigneeId: 'member-1',
            dueDate: '2026-04-10',
            createdAt: '2026-04-02T09:00:00.000Z',
            updatedAt: '2026-04-02T10:00:00.000Z',
          },
        ],
        DONE: [],
      },
    });
  });

  it('updates project fields and clears descriptions when requested', async () => {
    mockPrismaService.project.update.mockResolvedValue({
      id: 'project-1',
      name: 'Launch Website',
      description: null,
      ownerId: 'owner-1',
      tasks: [{ status: TaskStatus.DONE }],
    });

    const result = await projectsService.updateProject(ownerUser, 'project-1', {
      description: null,
    });

    expect(mockPrismaService.project.update).toHaveBeenCalledWith({
      where: {
        id: 'project-1',
      },
      data: {
        description: null,
      },
      select: expect.any(Object),
    });
    expect(result).toEqual({
      id: 'project-1',
      name: 'Launch Website',
      description: null,
      role: ProjectMemberRole.OWNER,
      taskCounts: {
        TODO: 0,
        IN_PROGRESS: 0,
        DONE: 1,
      },
    });
  });

  it('maps missing projects to not found errors during delete', async () => {
    mockPrismaService.project.delete.mockRejectedValue({
      code: 'P2025',
    });

    await expect(
      projectsService.deleteProject('missing-project'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
