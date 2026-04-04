/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { TaskLogEventType } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { TaskLogsService } from './task-logs.service';

describe('TaskLogsService', () => {
  const mockPrismaService = {
    task: {
      findUnique: jest.fn(),
    },
    taskLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  } as unknown as PrismaService & {
    task: {
      findUnique: jest.Mock;
    };
    taskLog: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
  };

  let taskLogsService: TaskLogsService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaService.task.findUnique.mockReset();
    mockPrismaService.taskLog.create.mockReset();
    mockPrismaService.taskLog.findMany.mockReset();
    mockPrismaService.user.findUnique.mockReset();
    mockPrismaService.task.findUnique.mockResolvedValue({
      id: 'task-1',
    });
    taskLogsService = new TaskLogsService(mockPrismaService);
  });

  it('returns task logs newest-first with actor payloads', async () => {
    mockPrismaService.taskLog.findMany.mockResolvedValue([
      {
        id: 'log-2',
        eventType: TaskLogEventType.TASK_UPDATED,
        fieldName: 'title',
        oldValue: 'Draft API envelope',
        newValue: 'Review API envelope',
        summary: 'Jane Doe updated the title',
        createdAt: new Date('2026-04-03T09:00:00.000Z'),
        actor: {
          id: 'user-1',
          name: 'Jane Doe',
        },
      },
      {
        id: 'log-1',
        eventType: TaskLogEventType.TASK_CREATED,
        fieldName: null,
        oldValue: null,
        newValue: null,
        summary: 'Jane Doe created the task',
        createdAt: new Date('2026-04-02T09:00:00.000Z'),
        actor: {
          id: 'user-1',
          name: 'Jane Doe',
        },
      },
    ]);

    await expect(taskLogsService.listTaskLogs('task-1')).resolves.toEqual({
      items: [
        {
          id: 'log-2',
          eventType: TaskLogEventType.TASK_UPDATED,
          fieldName: 'title',
          oldValue: 'Draft API envelope',
          newValue: 'Review API envelope',
          summary: 'Jane Doe updated the title',
          actor: {
            id: 'user-1',
            name: 'Jane Doe',
          },
          createdAt: '2026-04-03T09:00:00.000Z',
        },
        {
          id: 'log-1',
          eventType: TaskLogEventType.TASK_CREATED,
          fieldName: null,
          oldValue: null,
          newValue: null,
          summary: 'Jane Doe created the task',
          actor: {
            id: 'user-1',
            name: 'Jane Doe',
          },
          createdAt: '2026-04-02T09:00:00.000Z',
        },
      ],
      page: 1,
      pageSize: 10,
      hasMore: false,
    });
    expect(mockPrismaService.taskLog.findMany).toHaveBeenCalledWith({
      where: {
        taskId: 'task-1',
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: 0,
      take: 11,
      select: expect.any(Object),
    });
  });

  it('writes one TASK_UPDATED entry per changed field', async () => {
    await taskLogsService.createTaskUpdatedLogs(mockPrismaService, {
      actorId: 'user-1',
      actorName: 'Jane Doe',
      taskId: 'task-1',
      changes: [
        {
          fieldName: 'title',
          oldValue: 'Draft API envelope',
          newValue: 'Review API envelope',
        },
        {
          fieldName: 'dueDate',
          oldValue: null,
          newValue: '2026-04-15',
        },
      ],
    });

    expect(mockPrismaService.taskLog.create).toHaveBeenCalledTimes(2);
    expect(mockPrismaService.taskLog.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        taskId: 'task-1',
        eventType: TaskLogEventType.TASK_UPDATED,
        fieldName: 'title',
      }),
    });
    expect(mockPrismaService.taskLog.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        taskId: 'task-1',
        eventType: TaskLogEventType.TASK_UPDATED,
        fieldName: 'dueDate',
      }),
    });
  });

  it('writes a status-changed log with human-readable summary', async () => {
    await taskLogsService.createStatusChangedLog(mockPrismaService, {
      actorId: 'user-1',
      actorName: 'Jane Doe',
      taskId: 'task-1',
      previousStatusName: 'Todo',
      nextStatusName: 'In Progress',
    });

    expect(mockPrismaService.taskLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        taskId: 'task-1',
        eventType: TaskLogEventType.STATUS_CHANGED,
        fieldName: 'status',
        oldValue: 'Todo',
        newValue: 'In Progress',
        summary: 'Jane Doe moved the task from Todo to In Progress',
      }),
    });
  });

  it('returns an empty list when no logs exist for a task', async () => {
    mockPrismaService.taskLog.findMany.mockResolvedValue([]);

    await expect(taskLogsService.listTaskLogs('task-1')).resolves.toEqual({
      items: [],
      page: 1,
      pageSize: 10,
      hasMore: false,
    });
  });
});
