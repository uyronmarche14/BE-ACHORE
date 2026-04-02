/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { TaskLogsService } from '../../task-logs/service/task-logs.service';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  const currentUser = {
    id: 'member-1',
    name: 'Member User',
    email: 'member@example.com',
    role: 'MEMBER' as const,
  };

  const mockPrismaService = {
    $transaction: jest.fn(),
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
    projectMember: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  } as unknown as PrismaService & {
    $transaction: jest.Mock;
    task: {
      create: jest.Mock;
      findMany: jest.Mock;
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
    user: {
      findUnique: jest.Mock;
    };
  };

  let tasksService: TasksService;
  let taskLogsService: TaskLogsService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaService.$transaction.mockReset();
    mockPrismaService.task.create.mockReset();
    mockPrismaService.task.findMany.mockReset();
    mockPrismaService.task.findUnique.mockReset();
    mockPrismaService.task.update.mockReset();
    mockPrismaService.task.delete.mockReset();
    mockPrismaService.taskLog.create.mockReset();
    mockPrismaService.taskLog.findMany.mockReset();
    mockPrismaService.projectMember.findUnique.mockReset();
    mockPrismaService.user.findUnique.mockReset();
    mockPrismaService.$transaction.mockImplementation(
      async (
        callback: (
          transactionClient: typeof mockPrismaService,
        ) => Promise<unknown>,
      ) => callback(mockPrismaService),
    );

    taskLogsService = new TaskLogsService(mockPrismaService);
    tasksService = new TasksService(mockPrismaService, taskLogsService);
  });

  it('lists project tasks grouped by status with board-stable ordering', async () => {
    mockPrismaService.task.findMany.mockResolvedValue([
      {
        id: 'task-done',
        projectId: 'project-1',
        title: 'Celebrate release',
        description: null,
        status: TaskStatus.DONE,
        position: null,
        assigneeId: null,
        dueDate: null,
        createdAt: new Date('2026-04-04T09:00:00.000Z'),
        updatedAt: new Date('2026-04-04T09:00:00.000Z'),
      },
      {
        id: 'task-todo-2',
        projectId: 'project-1',
        title: 'Write smoke notes',
        description: null,
        status: TaskStatus.TODO,
        position: 2,
        assigneeId: null,
        dueDate: null,
        createdAt: new Date('2026-04-03T09:00:00.000Z'),
        updatedAt: new Date('2026-04-03T09:00:00.000Z'),
      },
      {
        id: 'task-progress',
        projectId: 'project-1',
        title: 'Review checklist',
        description: 'Keep the rollout on track',
        status: TaskStatus.IN_PROGRESS,
        position: null,
        assigneeId: 'member-2',
        dueDate: new Date('2026-04-12T00:00:00.000Z'),
        createdAt: new Date('2026-04-02T09:00:00.000Z'),
        updatedAt: new Date('2026-04-02T10:00:00.000Z'),
      },
      {
        id: 'task-todo-1',
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

    const result = await tasksService.listProjectTasks('project-1');

    expect(mockPrismaService.task.findMany).toHaveBeenCalledWith({
      where: {
        projectId: 'project-1',
      },
      select: expect.any(Object),
    });
    expect(result).toEqual({
      taskGroups: {
        TODO: [
          {
            id: 'task-todo-1',
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
          {
            id: 'task-todo-2',
            projectId: 'project-1',
            title: 'Write smoke notes',
            description: null,
            status: TaskStatus.TODO,
            position: 2,
            assigneeId: null,
            dueDate: null,
            createdAt: '2026-04-03T09:00:00.000Z',
            updatedAt: '2026-04-03T09:00:00.000Z',
          },
        ],
        IN_PROGRESS: [
          {
            id: 'task-progress',
            projectId: 'project-1',
            title: 'Review checklist',
            description: 'Keep the rollout on track',
            status: TaskStatus.IN_PROGRESS,
            position: null,
            assigneeId: 'member-2',
            dueDate: '2026-04-12',
            createdAt: '2026-04-02T09:00:00.000Z',
            updatedAt: '2026-04-02T10:00:00.000Z',
          },
        ],
        DONE: [
          {
            id: 'task-done',
            projectId: 'project-1',
            title: 'Celebrate release',
            description: null,
            status: TaskStatus.DONE,
            position: null,
            assigneeId: null,
            dueDate: null,
            createdAt: '2026-04-04T09:00:00.000Z',
            updatedAt: '2026-04-04T09:00:00.000Z',
          },
        ],
      },
    });
  });

  it('creates a task for an accessible project and valid assignee member', async () => {
    mockPrismaService.projectMember.findUnique.mockResolvedValue({
      id: 'membership-1',
    });
    mockPrismaService.task.create.mockResolvedValue({
      id: 'task-1',
      projectId: 'project-1',
      title: 'Ship launch checklist',
      description: 'Final review before launch',
      status: TaskStatus.IN_PROGRESS,
      position: null,
      assigneeId: 'member-2',
      dueDate: new Date('2026-04-15T00:00:00.000Z'),
      createdAt: new Date('2026-04-01T09:00:00.000Z'),
      updatedAt: new Date('2026-04-01T09:00:00.000Z'),
    });

    const result = await tasksService.createTask(currentUser, 'project-1', {
      title: 'Ship launch checklist',
      description: 'Final review before launch',
      status: TaskStatus.IN_PROGRESS,
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
    expect(mockPrismaService.task.create).toHaveBeenCalledWith({
      data: {
        projectId: 'project-1',
        title: 'Ship launch checklist',
        description: 'Final review before launch',
        status: TaskStatus.IN_PROGRESS,
        assigneeId: 'member-2',
        dueDate: new Date('2026-04-15'),
        createdById: 'member-1',
      },
      select: expect.any(Object),
    });
    expect(mockPrismaService.taskLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        taskId: 'task-1',
        actorId: 'member-1',
        eventType: 'TASK_CREATED',
        summary: 'Member User created the task',
      }),
    });
    expect(result).toEqual({
      id: 'task-1',
      projectId: 'project-1',
      title: 'Ship launch checklist',
      description: 'Final review before launch',
      status: TaskStatus.IN_PROGRESS,
      position: null,
      assigneeId: 'member-2',
      dueDate: '2026-04-15',
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
    mockPrismaService.task.findUnique.mockResolvedValue({
      id: 'task-1',
      projectId: 'project-1',
      title: 'Ship launch checklist',
      description: null,
      status: TaskStatus.TODO,
      position: 3,
      assigneeId: null,
      dueDate: null,
      createdAt: new Date('2026-04-01T09:00:00.000Z'),
      updatedAt: new Date('2026-04-02T10:00:00.000Z'),
    });

    await expect(tasksService.getTask('task-1')).resolves.toEqual({
      id: 'task-1',
      projectId: 'project-1',
      title: 'Ship launch checklist',
      description: null,
      status: TaskStatus.TODO,
      position: 3,
      assigneeId: null,
      dueDate: null,
      createdAt: '2026-04-01T09:00:00.000Z',
      updatedAt: '2026-04-02T10:00:00.000Z',
    });
  });

  it('patches task status, clears omitted position, and stamps updatedById', async () => {
    mockPrismaService.task.findUnique.mockResolvedValue({
      id: 'task-1',
      status: TaskStatus.TODO,
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

    const result = await tasksService.updateTaskStatus(currentUser, 'task-1', {
      status: TaskStatus.DONE,
    });

    expect(mockPrismaService.task.update).toHaveBeenCalledWith({
      where: {
        id: 'task-1',
      },
      data: {
        status: TaskStatus.DONE,
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
        oldValue: TaskStatus.TODO,
        newValue: TaskStatus.DONE,
      }),
    });
    expect(result).toEqual({
      id: 'task-1',
      projectId: 'project-1',
      title: 'Ship launch checklist',
      description: null,
      status: TaskStatus.DONE,
      position: null,
      assigneeId: null,
      dueDate: null,
      createdAt: '2026-04-01T09:00:00.000Z',
      updatedAt: '2026-04-06T09:00:00.000Z',
    });
  });

  it('persists an explicit positive position when patching task status', async () => {
    mockPrismaService.task.findUnique.mockResolvedValue({
      id: 'task-1',
      status: TaskStatus.TODO,
    });
    mockPrismaService.task.update.mockResolvedValue({
      id: 'task-1',
      projectId: 'project-1',
      title: 'Ship launch checklist',
      description: null,
      status: TaskStatus.IN_PROGRESS,
      position: 2,
      assigneeId: null,
      dueDate: null,
      createdAt: new Date('2026-04-01T09:00:00.000Z'),
      updatedAt: new Date('2026-04-06T10:00:00.000Z'),
    });

    const result = await tasksService.updateTaskStatus(currentUser, 'task-1', {
      status: TaskStatus.IN_PROGRESS,
      position: 2,
    });

    expect(mockPrismaService.task.update).toHaveBeenCalledWith({
      where: {
        id: 'task-1',
      },
      data: {
        status: TaskStatus.IN_PROGRESS,
        position: 2,
        updatedById: 'member-1',
      },
      select: expect.any(Object),
    });
    expect(result.position).toBe(2);
    expect(result.status).toBe(TaskStatus.IN_PROGRESS);
  });

  it('returns not found when patching the status of a missing task', async () => {
    mockPrismaService.task.findUnique.mockResolvedValue(null);

    await expect(
      tasksService.updateTaskStatus(currentUser, 'missing-task', {
        status: TaskStatus.DONE,
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
    mockPrismaService.task.update.mockResolvedValue({
      id: 'task-1',
      projectId: 'project-1',
      title: 'Review release notes',
      description: 'Review release notes with QA',
      status: TaskStatus.TODO,
      position: null,
      assigneeId: 'member-2',
      dueDate: new Date('2026-04-20T00:00:00.000Z'),
      createdAt: new Date('2026-04-01T09:00:00.000Z'),
      updatedAt: new Date('2026-04-02T11:00:00.000Z'),
    });

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
      status: TaskStatus.TODO,
      position: null,
      assigneeId: 'member-2',
      dueDate: '2026-04-20',
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
