/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { TaskLogsService } from '../../task-logs/service/task-logs.service';
import { TaskCommandsService } from './task-commands.service';
import { TaskQueriesService } from './task-queries.service';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  const currentUser = {
    id: 'member-1',
    name: 'Member User',
    email: 'member@example.com',
    role: 'MEMBER' as const,
    emailVerifiedAt: '2026-04-01T00:00:00.000Z',
  };

  const mockPrismaService = {
    $transaction: jest.fn(),
    task: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    taskLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    projectMember: {
      findUnique: jest.fn(),
    },
    projectStatus: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  } as unknown as PrismaService & {
    $transaction: jest.Mock;
    task: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    taskLog: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
    projectMember: {
      findUnique: jest.Mock;
    };
    projectStatus: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
  };

  let tasksService: TasksService;
  let taskLogsService: TaskLogsService;
  let taskQueriesService: TaskQueriesService;
  let taskCommandsService: TaskCommandsService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaService.$transaction.mockReset();
    mockPrismaService.task.create.mockReset();
    mockPrismaService.task.findUnique.mockReset();
    mockPrismaService.task.update.mockReset();
    mockPrismaService.task.delete.mockReset();
    mockPrismaService.taskLog.create.mockReset();
    mockPrismaService.taskLog.findMany.mockReset();
    mockPrismaService.projectMember.findUnique.mockReset();
    mockPrismaService.projectStatus.findMany.mockReset();
    mockPrismaService.projectStatus.findFirst.mockReset();
    mockPrismaService.user.findUnique.mockReset();
    mockPrismaService.$transaction.mockImplementation(
      async (
        callback: (
          transactionClient: typeof mockPrismaService,
        ) => Promise<unknown>,
      ) => callback(mockPrismaService),
    );

    taskLogsService = new TaskLogsService(mockPrismaService);
    taskQueriesService = new TaskQueriesService(mockPrismaService);
    taskCommandsService = new TaskCommandsService(
      mockPrismaService,
      taskLogsService,
    );
    tasksService = new TasksService(taskQueriesService, taskCommandsService);
  });

  it('lists project tasks grouped by status with board-stable ordering', async () => {
    mockPrismaService.projectStatus.findMany.mockResolvedValue([
      createProjectTaskStatusRecord({
        id: 'status-todo',
        name: 'Todo',
        position: 1,
        tasks: [
          createTaskRecord({
            id: 'task-todo-1',
            title: 'Draft API envelope',
            statusId: 'status-todo',
            status: createStatusRecord({
              id: 'status-todo',
              name: 'Todo',
              position: 1,
            }),
            position: 1,
            createdAt: new Date('2026-04-01T09:00:00.000Z'),
          }),
          createTaskRecord({
            id: 'task-todo-2',
            title: 'Write smoke notes',
            statusId: 'status-todo',
            status: createStatusRecord({
              id: 'status-todo',
              name: 'Todo',
              position: 1,
            }),
            position: 2,
            createdAt: new Date('2026-04-03T09:00:00.000Z'),
            updatedAt: new Date('2026-04-03T09:00:00.000Z'),
          }),
        ],
      }),
      createProjectTaskStatusRecord({
        id: 'status-progress',
        name: 'In Progress',
        position: 2,
        tasks: [
          createTaskRecord({
            id: 'task-progress',
            title: 'Review checklist',
            description: 'Keep the rollout on track',
            statusId: 'status-progress',
            status: createStatusRecord({
              id: 'status-progress',
              name: 'In Progress',
              position: 2,
            }),
            position: null,
            assigneeId: 'member-2',
            dueDate: new Date('2026-04-12T00:00:00.000Z'),
            createdAt: new Date('2026-04-02T09:00:00.000Z'),
            updatedAt: new Date('2026-04-02T10:00:00.000Z'),
          }),
        ],
      }),
      createProjectTaskStatusRecord({
        id: 'status-done',
        name: 'Done',
        position: 3,
        isClosed: true,
        tasks: [
          createTaskRecord({
            id: 'task-done',
            title: 'Celebrate release',
            statusId: 'status-done',
            status: createStatusRecord({
              id: 'status-done',
              name: 'Done',
              position: 3,
              isClosed: true,
            }),
            position: null,
            createdAt: new Date('2026-04-04T09:00:00.000Z'),
            updatedAt: new Date('2026-04-04T09:00:00.000Z'),
          }),
        ],
      }),
    ]);

    const result = await tasksService.listProjectTasks('project-1');

    expect(mockPrismaService.projectStatus.findMany).toHaveBeenCalledWith({
      where: {
        projectId: 'project-1',
      },
      orderBy: {
        position: 'asc',
      },
      select: expect.any(Object),
    });
    expect(result).toEqual({
      statuses: [
        {
          id: 'status-todo',
          name: 'Todo',
          position: 1,
          isClosed: false,
          color: 'SLATE',
          tasks: [
            {
              id: 'task-todo-1',
              projectId: 'project-1',
              title: 'Draft API envelope',
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
              position: 1,
              assigneeId: null,
              dueDate: null,
              links: [],
              checklistItems: [],
              subtasks: [],
              createdAt: '2026-04-01T09:00:00.000Z',
              updatedAt: '2026-04-01T09:00:00.000Z',
            },
            {
              id: 'task-todo-2',
              projectId: 'project-1',
              title: 'Write smoke notes',
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
              position: 2,
              assigneeId: null,
              dueDate: null,
              links: [],
              checklistItems: [],
              subtasks: [],
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
              id: 'task-progress',
              projectId: 'project-1',
              title: 'Review checklist',
              description: 'Keep the rollout on track',
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
              position: null,
              assigneeId: 'member-2',
              dueDate: '2026-04-12',
              links: [],
              checklistItems: [],
              subtasks: [],
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
          tasks: [
            {
              id: 'task-done',
              projectId: 'project-1',
              title: 'Celebrate release',
              description: null,
              acceptanceCriteria: null,
              notes: null,
              parentTaskId: null,
              statusId: 'status-done',
              status: {
                id: 'status-done',
                name: 'Done',
                position: 3,
                isClosed: true,
                color: 'GREEN',
              },
              position: null,
              assigneeId: null,
              dueDate: null,
              links: [],
              checklistItems: [],
              subtasks: [],
              createdAt: '2026-04-04T09:00:00.000Z',
              updatedAt: '2026-04-04T09:00:00.000Z',
            },
          ],
        },
      ],
    });
  });

  it('creates a task for an accessible project and valid assignee member', async () => {
    mockPrismaService.projectMember.findUnique.mockResolvedValue({
      id: 'membership-1',
    });
    mockPrismaService.user.findUnique.mockResolvedValue({
      id: 'member-2',
      name: 'Jordan Lane',
    });
    mockPrismaService.projectStatus.findFirst.mockResolvedValue(
      createStatusRecord({
        id: 'status-progress',
        name: 'In Progress',
        position: 2,
      }),
    );
    mockPrismaService.task.create.mockResolvedValue(
      createTaskRecord({
        id: 'task-1',
        title: 'Ship launch checklist',
        description: 'Final review before launch',
        statusId: 'status-progress',
        status: createStatusRecord({
          id: 'status-progress',
          name: 'In Progress',
          position: 2,
        }),
        position: null,
        assigneeId: 'member-2',
        dueDate: new Date('2026-04-15T00:00:00.000Z'),
      }),
    );

    const result = await tasksService.createTask(currentUser, 'project-1', {
      title: 'Ship launch checklist',
      description: 'Final review before launch',
      statusId: 'status-progress',
      assigneeId: 'member-2',
      dueDate: '2026-04-15',
    });

    expect(mockPrismaService.projectMember.findUnique).toHaveBeenCalledWith({
      where: {
        projectId_userId: {
          projectId: 'project-1',
          userId: 'member-2',
        },
      },
      select: {
        id: true,
      },
    });
    expect(mockPrismaService.projectStatus.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'status-progress',
        projectId: 'project-1',
      },
      select: {
        id: true,
        name: true,
        position: true,
        isClosed: true,
        color: true,
      },
    });
    expect(mockPrismaService.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: 'project-1',
          title: 'Ship launch checklist',
          description: 'Final review before launch',
          acceptanceCriteria: null,
          notes: null,
          parentTaskId: null,
          statusId: 'status-progress',
          assigneeId: 'member-2',
          dueDate: new Date('2026-04-15'),
          createdById: 'member-1',
        }),
        select: expect.any(Object),
      }),
    );
    expect(mockPrismaService.taskLog.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        taskId: 'task-1',
        actorId: 'member-1',
        eventType: 'TASK_CREATED',
        summary: 'Member User created the task',
      }),
    });
    expect(mockPrismaService.taskLog.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        taskId: 'task-1',
        actorId: 'member-1',
        eventType: 'TASK_UPDATED',
        fieldName: 'assigneeId',
        oldValue: Prisma.JsonNull,
        newValue: {
          id: 'member-2',
          name: 'Jordan Lane',
        },
      }),
    });
    expect(result).toEqual({
      id: 'task-1',
      projectId: 'project-1',
      title: 'Ship launch checklist',
      description: 'Final review before launch',
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
      position: null,
      assigneeId: 'member-2',
      dueDate: '2026-04-15',
      links: [],
      checklistItems: [],
      subtasks: [],
      createdAt: '2026-04-01T09:00:00.000Z',
      updatedAt: '2026-04-01T09:00:00.000Z',
    });
  });

  it('rejects assignees that are not members of the project', async () => {
    mockPrismaService.projectMember.findUnique.mockResolvedValue(null);

    await expect(
      tasksService.createTask(currentUser, 'project-1', {
        title: 'Ship launch checklist',
        assigneeId: 'outsider-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mockPrismaService.task.create).not.toHaveBeenCalled();
  });

  it('returns a normalized task shape when loading a task by id', async () => {
    mockPrismaService.task.findUnique.mockResolvedValue(
      createTaskRecord({
        id: 'task-1',
        title: 'Ship launch checklist',
        statusId: 'status-todo',
        status: createStatusRecord({
          id: 'status-todo',
          name: 'Todo',
          position: 1,
        }),
        position: 3,
        updatedAt: new Date('2026-04-02T10:00:00.000Z'),
      }),
    );

    await expect(tasksService.getTask('task-1')).resolves.toEqual({
      id: 'task-1',
      projectId: 'project-1',
      title: 'Ship launch checklist',
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
      position: 3,
      assigneeId: null,
      dueDate: null,
      links: [],
      checklistItems: [],
      subtasks: [],
      createdAt: '2026-04-01T09:00:00.000Z',
      updatedAt: '2026-04-02T10:00:00.000Z',
    });
  });

  it('patches task status, clears omitted position, and stamps updatedById', async () => {
    mockPrismaService.task.findUnique.mockResolvedValue({
      id: 'task-1',
      projectId: 'project-1',
      statusId: 'status-todo',
      status: {
        name: 'Todo',
      },
    });
    mockPrismaService.projectStatus.findFirst.mockResolvedValue(
      createStatusRecord({
        id: 'status-done',
        name: 'Done',
        position: 3,
        isClosed: true,
      }),
    );
    mockPrismaService.task.update.mockResolvedValue(
      createTaskRecord({
        id: 'task-1',
        title: 'Ship launch checklist',
        statusId: 'status-done',
        status: createStatusRecord({
          id: 'status-done',
          name: 'Done',
          position: 3,
          isClosed: true,
        }),
        position: null,
        updatedAt: new Date('2026-04-06T09:00:00.000Z'),
      }),
    );

    const result = await tasksService.updateTaskStatus(currentUser, 'task-1', {
      statusId: 'status-done',
    });

    expect(mockPrismaService.task.update).toHaveBeenCalledWith({
      where: {
        id: 'task-1',
      },
      data: {
        statusId: 'status-done',
        position: null,
        updatedById: 'member-1',
      },
      select: expect.any(Object),
    });
    expect(mockPrismaService.taskLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        taskId: 'task-1',
        actorId: 'member-1',
        eventType: 'STATUS_CHANGED',
        fieldName: 'status',
        oldValue: 'Todo',
        newValue: 'Done',
      }),
    });
    expect(result).toEqual({
      id: 'task-1',
      projectId: 'project-1',
      title: 'Ship launch checklist',
      description: null,
      acceptanceCriteria: null,
      notes: null,
      parentTaskId: null,
      statusId: 'status-done',
      status: {
        id: 'status-done',
        name: 'Done',
        position: 3,
        isClosed: true,
        color: 'GREEN',
      },
      position: null,
      assigneeId: null,
      dueDate: null,
      links: [],
      checklistItems: [],
      subtasks: [],
      createdAt: '2026-04-01T09:00:00.000Z',
      updatedAt: '2026-04-06T09:00:00.000Z',
    });
  });

  it('persists an explicit positive position when patching task status', async () => {
    mockPrismaService.task.findUnique.mockResolvedValue({
      id: 'task-1',
      projectId: 'project-1',
      statusId: 'status-todo',
      status: {
        name: 'Todo',
      },
    });
    mockPrismaService.projectStatus.findFirst.mockResolvedValue(
      createStatusRecord({
        id: 'status-progress',
        name: 'In Progress',
        position: 2,
      }),
    );
    mockPrismaService.task.update.mockResolvedValue(
      createTaskRecord({
        id: 'task-1',
        title: 'Ship launch checklist',
        statusId: 'status-progress',
        status: createStatusRecord({
          id: 'status-progress',
          name: 'In Progress',
          position: 2,
        }),
        position: 2,
        updatedAt: new Date('2026-04-06T10:00:00.000Z'),
      }),
    );

    const result = await tasksService.updateTaskStatus(currentUser, 'task-1', {
      statusId: 'status-progress',
      position: 2,
    });

    expect(mockPrismaService.task.update).toHaveBeenCalledWith({
      where: {
        id: 'task-1',
      },
      data: {
        statusId: 'status-progress',
        position: 2,
        updatedById: 'member-1',
      },
      select: expect.any(Object),
    });
    expect(result.position).toBe(2);
    expect(result.status).toEqual({
      id: 'status-progress',
      name: 'In Progress',
      position: 2,
      isClosed: false,
      color: 'BLUE',
    });
  });

  it('does not create a status-change log when the patched status is unchanged', async () => {
    mockPrismaService.task.findUnique.mockResolvedValue({
      id: 'task-1',
      projectId: 'project-1',
      statusId: 'status-progress',
      status: {
        name: 'In Progress',
      },
    });
    mockPrismaService.projectStatus.findFirst.mockResolvedValue(
      createStatusRecord({
        id: 'status-progress',
        name: 'In Progress',
        position: 2,
      }),
    );
    mockPrismaService.task.update.mockResolvedValue(
      createTaskRecord({
        id: 'task-1',
        title: 'Ship launch checklist',
        statusId: 'status-progress',
        status: createStatusRecord({
          id: 'status-progress',
          name: 'In Progress',
          position: 2,
        }),
        updatedAt: new Date('2026-04-06T10:00:00.000Z'),
      }),
    );

    await tasksService.updateTaskStatus(currentUser, 'task-1', {
      statusId: 'status-progress',
    });

    expect(mockPrismaService.taskLog.create).not.toHaveBeenCalled();
  });

  it('returns not found when patching the status of a missing task', async () => {
    mockPrismaService.task.findUnique.mockResolvedValue(null);

    await expect(
      tasksService.updateTaskStatus(currentUser, 'missing-task', {
        statusId: 'status-done',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates allowed task fields and stamps updatedById', async () => {
    mockPrismaService.task.findUnique.mockResolvedValue({
      projectId: 'project-1',
      title: 'Ship launch checklist',
      description: null,
      assigneeId: null,
      dueDate: null,
    });
    mockPrismaService.projectMember.findUnique.mockResolvedValue({
      id: 'membership-2',
    });
    mockPrismaService.user.findUnique.mockResolvedValue({
      id: 'member-2',
      name: 'Jordan Lane',
    });
    mockPrismaService.task.update.mockResolvedValue(
      createTaskRecord({
        id: 'task-1',
        title: 'Review release notes',
        description: 'Review release notes with QA',
        statusId: 'status-todo',
        status: createStatusRecord({
          id: 'status-todo',
          name: 'Todo',
          position: 1,
        }),
        assigneeId: 'member-2',
        dueDate: new Date('2026-04-20T00:00:00.000Z'),
        position: null,
        updatedAt: new Date('2026-04-02T11:00:00.000Z'),
      }),
    );

    const result = await tasksService.updateTask(currentUser, 'task-1', {
      title: 'Review release notes',
      description: 'Review release notes with QA',
      assigneeId: 'member-2',
      dueDate: '2026-04-20',
    });

    expect(mockPrismaService.task.update).toHaveBeenCalledWith({
      where: {
        id: 'task-1',
      },
      data: {
        title: 'Review release notes',
        description: 'Review release notes with QA',
        assigneeId: 'member-2',
        dueDate: new Date('2026-04-20'),
        updatedById: 'member-1',
      },
      select: expect.any(Object),
    });
    expect(mockPrismaService.taskLog.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        taskId: 'task-1',
        actorId: 'member-1',
        eventType: 'TASK_UPDATED',
        fieldName: 'title',
        oldValue: 'Ship launch checklist',
        newValue: 'Review release notes',
      }),
    });
    expect(mockPrismaService.taskLog.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        taskId: 'task-1',
        actorId: 'member-1',
        eventType: 'TASK_UPDATED',
        fieldName: 'description',
        oldValue: Prisma.JsonNull,
        newValue: 'Review release notes with QA',
      }),
    });
    expect(mockPrismaService.taskLog.create).toHaveBeenNthCalledWith(3, {
      data: expect.objectContaining({
        taskId: 'task-1',
        actorId: 'member-1',
        eventType: 'TASK_UPDATED',
        fieldName: 'dueDate',
        oldValue: Prisma.JsonNull,
        newValue: '2026-04-20',
      }),
    });
    expect(mockPrismaService.taskLog.create).toHaveBeenNthCalledWith(4, {
      data: expect.objectContaining({
        taskId: 'task-1',
        actorId: 'member-1',
        eventType: 'TASK_UPDATED',
        fieldName: 'assigneeId',
        oldValue: expect.anything(),
        newValue: {
          id: 'member-2',
          name: 'Jordan Lane',
        },
      }),
    });
    expect(result).toEqual({
      id: 'task-1',
      projectId: 'project-1',
      title: 'Review release notes',
      description: 'Review release notes with QA',
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
      assigneeId: 'member-2',
      dueDate: '2026-04-20',
      links: [],
      checklistItems: [],
      subtasks: [],
      createdAt: '2026-04-01T09:00:00.000Z',
      updatedAt: '2026-04-02T11:00:00.000Z',
    });
  });

  it('deletes an existing task and returns the success message', async () => {
    mockPrismaService.task.delete.mockResolvedValue({
      id: 'task-1',
    });

    await expect(tasksService.deleteTask('task-1')).resolves.toEqual({
      message: 'Task deleted successfully',
    });
  });

  it('throws a not found exception when the task does not exist', async () => {
    mockPrismaService.task.findUnique.mockResolvedValue(null);

    await expect(tasksService.getTask('missing-task')).rejects.toBeInstanceOf(
      NotFoundException,
    );
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

function createTaskRecord(
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
    subtasks: Array<unknown>;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) {
  return {
    id: overrides.id ?? 'task-1',
    projectId: overrides.projectId ?? 'project-1',
    title: overrides.title ?? 'Ship launch checklist',
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
    subtasks: overrides.subtasks ?? [],
    createdAt: overrides.createdAt ?? new Date('2026-04-01T09:00:00.000Z'),
    updatedAt: overrides.updatedAt ?? new Date('2026-04-01T09:00:00.000Z'),
  };
}

function createProjectTaskStatusRecord(
  overrides: Partial<{
    id: string;
    name: string;
    position: number;
    isClosed: boolean;
    color: string;
    tasks: Array<ReturnType<typeof createTaskRecord>>;
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
