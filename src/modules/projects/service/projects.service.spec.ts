/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { NotFoundException } from '@nestjs/common';
import { ProjectMemberRole } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { ProjectActivityService } from './project-activity.service';
import { ProjectMutationsService } from './project-mutations.service';
import { ProjectQueriesService } from './project-queries.service';
import { ProjectStatusesService } from './project-statuses.service';
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
      findUniqueOrThrow: jest.fn(),
    },
    projectMember: {
      create: jest.fn(),
    },
    projectStatus: {
      createMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockPrismaService = {
    project: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    projectStatus: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
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
    projectStatus: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  let projectsService: ProjectsService;
  let projectQueriesService: ProjectQueriesService;
  let projectMutationsService: ProjectMutationsService;
  let projectStatusesService: ProjectStatusesService;
  let projectActivityService: ProjectActivityService;

  beforeEach(() => {
    jest.clearAllMocks();
    transactionClient.project.create.mockReset();
    transactionClient.project.findUniqueOrThrow.mockReset();
    transactionClient.projectMember.create.mockReset();
    transactionClient.projectStatus.createMany.mockReset();
    transactionClient.projectStatus.create.mockReset();
    transactionClient.projectStatus.findFirst.mockReset();
    transactionClient.projectStatus.findMany.mockReset();
    transactionClient.projectStatus.update.mockReset();
    mockPrismaService.project.findMany.mockReset();
    mockPrismaService.project.findUnique.mockReset();
    mockPrismaService.project.update.mockReset();
    mockPrismaService.project.delete.mockReset();
    mockPrismaService.projectStatus.findFirst.mockReset();
    mockPrismaService.projectStatus.findMany.mockReset();
    mockPrismaService.projectStatus.create.mockReset();
    mockPrismaService.$transaction.mockReset();
    mockPrismaService.$transaction.mockImplementation(
      async (
        callback: (client: typeof transactionClient) => Promise<unknown>,
      ) => callback(transactionClient),
    );

    projectQueriesService = new ProjectQueriesService(mockPrismaService);
    projectMutationsService = new ProjectMutationsService(mockPrismaService);
    projectStatusesService = new ProjectStatusesService(mockPrismaService);
    projectActivityService = new ProjectActivityService(mockPrismaService);
    projectsService = new ProjectsService(
      projectQueriesService,
      projectMutationsService,
      projectStatusesService,
      projectActivityService,
    );
  });

  it('creates a project and owner membership in one transaction', async () => {
    transactionClient.project.create.mockResolvedValue({
      id: 'project-1',
    });
    transactionClient.projectMember.create.mockResolvedValue({
      id: 'membership-1',
    });
    transactionClient.projectStatus.createMany.mockResolvedValue({
      count: 3,
    });
    transactionClient.project.findUniqueOrThrow.mockResolvedValue(
      createProjectSummaryRecord({
        id: 'project-1',
        name: 'Launch Website',
        description: 'Track launch tasks',
        ownerId: 'owner-1',
      }),
    );

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
    expect(transactionClient.projectStatus.createMany).toHaveBeenCalled();
    expect(result).toEqual({
      id: 'project-1',
      name: 'Launch Website',
      description: 'Track launch tasks',
      role: ProjectMemberRole.OWNER,
      statuses: [
        {
          id: 'status-todo',
          name: 'Todo',
          position: 1,
          isClosed: false,
          color: 'SLATE',
          taskCount: 0,
        },
        {
          id: 'status-progress',
          name: 'In Progress',
          position: 2,
          isClosed: false,
          color: 'BLUE',
          taskCount: 0,
        },
        {
          id: 'status-done',
          name: 'Done',
          position: 3,
          isClosed: true,
          color: 'GREEN',
          taskCount: 0,
        },
      ],
    });
  });

  it('lists only accessible projects for a member user', async () => {
    mockPrismaService.project.findMany.mockResolvedValue([
      createProjectSummaryRecord({
        id: 'project-1',
        name: 'Owned Project',
        description: 'Owned description',
        ownerId: 'member-1',
        statuses: [
          createProjectSummaryStatusRecord({
            id: 'status-todo',
            name: 'Todo',
            position: 1,
            tasks: [{ id: 'task-1' }],
          }),
          createProjectSummaryStatusRecord({
            id: 'status-done',
            name: 'Done',
            position: 3,
            isClosed: true,
            tasks: [{ id: 'task-2' }],
          }),
        ],
      }),
      createProjectSummaryRecord({
        id: 'project-2',
        name: 'Joined Project',
        description: null,
        ownerId: 'owner-1',
        statuses: [
          createProjectSummaryStatusRecord({
            id: 'status-progress',
            name: 'In Progress',
            position: 2,
            tasks: [{ id: 'task-3' }],
          }),
        ],
      }),
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
          statuses: [
            {
              id: 'status-todo',
              name: 'Todo',
              position: 1,
              isClosed: false,
              color: 'SLATE',
              taskCount: 1,
            },
            {
              id: 'status-done',
              name: 'Done',
              position: 3,
              isClosed: true,
              color: 'GREEN',
              taskCount: 1,
            },
          ],
        },
        {
          id: 'project-2',
          name: 'Joined Project',
          description: null,
          role: ProjectMemberRole.MEMBER,
          statuses: [
            {
              id: 'status-progress',
              name: 'In Progress',
              position: 2,
              isClosed: false,
              color: 'BLUE',
              taskCount: 1,
            },
          ],
        },
      ],
    });
  });

  it('lists all projects for an admin user and preserves documented role output', async () => {
    mockPrismaService.project.findMany.mockResolvedValue([
      createProjectSummaryRecord({
        id: 'project-1',
        name: 'Admin Visible Project',
        ownerId: 'owner-1',
      }),
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
          statuses: [
            {
              id: 'status-todo',
              name: 'Todo',
              position: 1,
              isClosed: false,
              color: 'SLATE',
              taskCount: 0,
            },
            {
              id: 'status-progress',
              name: 'In Progress',
              position: 2,
              isClosed: false,
              color: 'BLUE',
              taskCount: 0,
            },
            {
              id: 'status-done',
              name: 'Done',
              position: 3,
              isClosed: true,
              color: 'GREEN',
              taskCount: 0,
            },
          ],
        },
      ],
    });
  });

  it('returns grouped project detail with sorted members and board-ready statuses', async () => {
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
      statuses: [
        createProjectDetailStatusRecord({
          id: 'status-todo',
          name: 'Todo',
          position: 1,
          tasks: [
            createProjectTaskRecord({
              id: 'task-3',
              title: 'Finalize QA',
              statusId: 'status-todo',
              status: createStatusRecord({
                id: 'status-todo',
                name: 'Todo',
                position: 1,
              }),
              position: null,
              createdAt: new Date('2026-04-03T09:00:00.000Z'),
              updatedAt: new Date('2026-04-03T09:00:00.000Z'),
            }),
            createProjectTaskRecord({
              id: 'task-1',
              title: 'Draft launch checklist',
              description: 'Capture release requirements',
              statusId: 'status-todo',
              status: createStatusRecord({
                id: 'status-todo',
                name: 'Todo',
                position: 1,
              }),
              position: 1,
              dueDate: new Date('2026-04-08T00:00:00.000Z'),
              createdAt: new Date('2026-04-01T09:00:00.000Z'),
              updatedAt: new Date('2026-04-01T10:00:00.000Z'),
            }),
          ],
        }),
        createProjectDetailStatusRecord({
          id: 'status-progress',
          name: 'In Progress',
          position: 2,
          tasks: [
            createProjectTaskRecord({
              id: 'task-2',
              title: 'Ship assets',
              description: 'Coordinate release files',
              statusId: 'status-progress',
              status: createStatusRecord({
                id: 'status-progress',
                name: 'In Progress',
                position: 2,
              }),
              position: 2,
              assigneeId: 'member-1',
              dueDate: new Date('2026-04-10T00:00:00.000Z'),
              createdAt: new Date('2026-04-02T09:00:00.000Z'),
              updatedAt: new Date('2026-04-02T10:00:00.000Z'),
            }),
          ],
        }),
        createProjectDetailStatusRecord({
          id: 'status-done',
          name: 'Done',
          position: 3,
          isClosed: true,
          tasks: [],
        }),
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
      statuses: [
        {
          id: 'status-todo',
          name: 'Todo',
          position: 1,
          isClosed: false,
          color: 'SLATE',
          tasks: [
            {
              id: 'task-1',
              projectId: 'project-1',
              title: 'Draft launch checklist',
              description: 'Capture release requirements',
              acceptanceCriteria: null,
              notes: null,
              parentTaskId: null,
              statusId: 'status-todo',
              status: {
                id: 'status-todo',
                name: 'Todo',
                position: 1,
                isClosed: false,
                color: 'SLATE',
              },
              position: 1,
              assigneeId: null,
              dueDate: '2026-04-08',
              links: [],
              checklistItems: [],
              createdAt: '2026-04-01T09:00:00.000Z',
              updatedAt: '2026-04-01T10:00:00.000Z',
            },
            {
              id: 'task-3',
              projectId: 'project-1',
              title: 'Finalize QA',
              description: null,
              acceptanceCriteria: null,
              notes: null,
              parentTaskId: null,
              statusId: 'status-todo',
              status: {
                id: 'status-todo',
                name: 'Todo',
                position: 1,
                isClosed: false,
                color: 'SLATE',
              },
              position: null,
              assigneeId: null,
              dueDate: null,
              links: [],
              checklistItems: [],
              createdAt: '2026-04-03T09:00:00.000Z',
              updatedAt: '2026-04-03T09:00:00.000Z',
            },
          ],
        },
        {
          id: 'status-progress',
          name: 'In Progress',
          position: 2,
          isClosed: false,
          color: 'BLUE',
          tasks: [
            {
              id: 'task-2',
              projectId: 'project-1',
              title: 'Ship assets',
              description: 'Coordinate release files',
              acceptanceCriteria: null,
              notes: null,
              parentTaskId: null,
              statusId: 'status-progress',
              status: {
                id: 'status-progress',
                name: 'In Progress',
                position: 2,
                isClosed: false,
                color: 'BLUE',
              },
              position: 2,
              assigneeId: 'member-1',
              dueDate: '2026-04-10',
              links: [],
              checklistItems: [],
              createdAt: '2026-04-02T09:00:00.000Z',
              updatedAt: '2026-04-02T10:00:00.000Z',
            },
          ],
        },
        {
          id: 'status-done',
          name: 'Done',
          position: 3,
          isClosed: true,
          color: 'GREEN',
          tasks: [],
        },
      ],
    });
  });

  it('creates a new dynamic project status after the current last lane', async () => {
    mockPrismaService.project.findUnique.mockResolvedValue({
      id: 'project-1',
    });
    transactionClient.projectStatus.findFirst.mockResolvedValue({
      position: 3,
    });
    transactionClient.projectStatus.create.mockResolvedValue({
      id: 'status-review',
      name: 'Review',
      position: 4,
      isClosed: false,
      color: 'BLUE',
    });

    const result = await projectsService.createProjectStatus('project-1', {
      name: 'Review',
    });

    expect(mockPrismaService.project.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'project-1',
      },
      select: {
        id: true,
      },
    });
    expect(transactionClient.projectStatus.findFirst).toHaveBeenCalledWith({
      where: {
        projectId: 'project-1',
      },
      orderBy: {
        position: 'desc',
      },
      select: {
        position: true,
      },
    });
    expect(transactionClient.projectStatus.create).toHaveBeenCalledWith({
      data: {
        projectId: 'project-1',
        name: 'Review',
        position: 4,
        isClosed: false,
        color: 'BLUE',
      },
      select: {
        id: true,
        name: true,
        position: true,
        isClosed: true,
        color: true,
      },
    });
    expect(result).toEqual({
      id: 'status-review',
      name: 'Review',
      position: 4,
      isClosed: false,
      color: 'BLUE',
      taskCount: 0,
    });
  });

  it('reorders project statuses through temporary positions to avoid unique collisions', async () => {
    mockPrismaService.projectStatus.findMany.mockResolvedValue([
      { id: 'status-todo' },
      { id: 'status-progress' },
      { id: 'status-done' },
    ]);
    transactionClient.projectStatus.update.mockResolvedValue(undefined);
    transactionClient.projectStatus.findMany.mockResolvedValue([
      createProjectSummaryStatusRecord({
        id: 'status-progress',
        name: 'In Progress',
        position: 1,
        tasks: [{ id: 'task-1' }],
      }),
      createProjectSummaryStatusRecord({
        id: 'status-done',
        name: 'Done',
        position: 2,
        isClosed: true,
        tasks: [],
      }),
      createProjectSummaryStatusRecord({
        id: 'status-todo',
        name: 'Todo',
        position: 3,
        tasks: [{ id: 'task-2' }, { id: 'task-3' }],
      }),
    ]);

    const result = await projectStatusesService.reorderProjectStatuses(
      'project-1',
      {
        statuses: [
          { id: 'status-progress' },
          { id: 'status-done' },
          { id: 'status-todo' },
        ],
      },
    );

    expect(transactionClient.projectStatus.update.mock.calls).toEqual([
      [
        {
          where: { id: 'status-progress' },
          data: { position: -1 },
        },
      ],
      [
        {
          where: { id: 'status-done' },
          data: { position: -2 },
        },
      ],
      [
        {
          where: { id: 'status-todo' },
          data: { position: -3 },
        },
      ],
      [
        {
          where: { id: 'status-progress' },
          data: { position: 1 },
        },
      ],
      [
        {
          where: { id: 'status-done' },
          data: { position: 2 },
        },
      ],
      [
        {
          where: { id: 'status-todo' },
          data: { position: 3 },
        },
      ],
    ]);
    expect(result).toEqual({
      items: [
        {
          id: 'status-progress',
          name: 'In Progress',
          position: 1,
          isClosed: false,
          color: 'BLUE',
          taskCount: 1,
        },
        {
          id: 'status-done',
          name: 'Done',
          position: 2,
          isClosed: true,
          color: 'GREEN',
          taskCount: 0,
        },
        {
          id: 'status-todo',
          name: 'Todo',
          position: 3,
          isClosed: false,
          color: 'SLATE',
          taskCount: 2,
        },
      ],
    });
  });

  it('maps missing projects to not found errors during status creation', async () => {
    mockPrismaService.project.findUnique.mockResolvedValue(null);

    await expect(
      projectsService.createProjectStatus('missing-project', {
        name: 'Review',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates project fields and clears descriptions when requested', async () => {
    mockPrismaService.project.update.mockResolvedValue(
      createProjectSummaryRecord({
        id: 'project-1',
        name: 'Launch Website',
        description: null,
        ownerId: 'owner-1',
        statuses: [
          createProjectSummaryStatusRecord({
            id: 'status-done',
            name: 'Done',
            position: 3,
            isClosed: true,
            tasks: [{ id: 'task-1' }],
          }),
        ],
      }),
    );

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
      statuses: [
        {
          id: 'status-done',
          name: 'Done',
          position: 3,
          isClosed: true,
          color: 'GREEN',
          taskCount: 1,
        },
      ],
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

function createStatusRecord(
  overrides: Partial<{
    id: string;
    name: string;
    position: number;
    isClosed: boolean;
    color: string;
  }> = {},
) {
  return {
    id: overrides.id ?? 'status-todo',
    name: overrides.name ?? 'Todo',
    position: overrides.position ?? 1,
    isClosed: overrides.isClosed ?? false,
    color:
      overrides.color ??
      (overrides.isClosed
        ? 'GREEN'
        : (overrides.id ?? 'status-todo') === 'status-progress'
          ? 'BLUE'
          : 'SLATE'),
  };
}

function createProjectSummaryStatusRecord(
  overrides: Partial<{
    id: string;
    name: string;
    position: number;
    isClosed: boolean;
    color: string;
    tasks: Array<{ id: string }>;
  }> = {},
) {
  return {
    id: overrides.id ?? 'status-todo',
    name: overrides.name ?? 'Todo',
    position: overrides.position ?? 1,
    isClosed: overrides.isClosed ?? false,
    color:
      overrides.color ??
      (overrides.isClosed
        ? 'GREEN'
        : (overrides.id ?? 'status-todo') === 'status-progress'
          ? 'BLUE'
          : 'SLATE'),
    tasks: overrides.tasks ?? [],
  };
}

function createProjectSummaryRecord(
  overrides: Partial<{
    id: string;
    name: string;
    description: string | null;
    ownerId: string;
    statuses: Array<ReturnType<typeof createProjectSummaryStatusRecord>>;
  }> = {},
) {
  return {
    id: overrides.id ?? 'project-1',
    name: overrides.name ?? 'Launch Website',
    description: overrides.description ?? null,
    ownerId: overrides.ownerId ?? 'owner-1',
    statuses: overrides.statuses ?? [
      createProjectSummaryStatusRecord({
        id: 'status-todo',
        name: 'Todo',
        position: 1,
      }),
      createProjectSummaryStatusRecord({
        id: 'status-progress',
        name: 'In Progress',
        position: 2,
      }),
      createProjectSummaryStatusRecord({
        id: 'status-done',
        name: 'Done',
        position: 3,
        isClosed: true,
      }),
    ],
  };
}

function createProjectTaskRecord(
  overrides: Partial<{
    id: string;
    projectId: string;
    title: string;
    description: string | null;
    acceptanceCriteria: string | null;
    notes: string | null;
    parentTaskId: string | null;
    statusId: string;
    status: ReturnType<typeof createStatusRecord>;
    position: number | null;
    assigneeId: string | null;
    dueDate: Date | null;
    links: Array<{
      id: string;
      label: string;
      url: string;
      position: number;
    }>;
    checklistItems: Array<{
      id: string;
      label: string;
      isCompleted: boolean;
      position: number;
    }>;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) {
  return {
    id: overrides.id ?? 'task-1',
    projectId: overrides.projectId ?? 'project-1',
    title: overrides.title ?? 'Task',
    description: overrides.description ?? null,
    acceptanceCriteria: overrides.acceptanceCriteria ?? null,
    notes: overrides.notes ?? null,
    parentTaskId: overrides.parentTaskId ?? null,
    statusId: overrides.statusId ?? 'status-todo',
    status:
      overrides.status ??
      createStatusRecord({
        id: overrides.statusId ?? 'status-todo',
      }),
    position: overrides.position ?? null,
    assigneeId: overrides.assigneeId ?? null,
    dueDate: overrides.dueDate ?? null,
    links: overrides.links ?? [],
    checklistItems: overrides.checklistItems ?? [],
    createdAt: overrides.createdAt ?? new Date('2026-04-01T09:00:00.000Z'),
    updatedAt: overrides.updatedAt ?? new Date('2026-04-01T09:00:00.000Z'),
  };
}

function createProjectDetailStatusRecord(
  overrides: Partial<{
    id: string;
    name: string;
    position: number;
    isClosed: boolean;
    color: string;
    tasks: Array<ReturnType<typeof createProjectTaskRecord>>;
  }> = {},
) {
  return {
    id: overrides.id ?? 'status-todo',
    name: overrides.name ?? 'Todo',
    position: overrides.position ?? 1,
    isClosed: overrides.isClosed ?? false,
    color:
      overrides.color ??
      (overrides.isClosed
        ? 'GREEN'
        : (overrides.id ?? 'status-todo') === 'status-progress'
          ? 'BLUE'
          : 'SLATE'),
    tasks: overrides.tasks ?? [],
  };
}
