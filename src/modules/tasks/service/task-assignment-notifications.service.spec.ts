/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { PrismaService } from '../../../database/prisma.service';
import { TaskAssignmentNotificationsService } from './task-assignment-notifications.service';

describe('TaskAssignmentNotificationsService', () => {
  const currentUser = {
    id: 'member-2',
    name: 'Alex Chen',
    email: 'alex@example.com',
    role: 'MEMBER' as const,
    emailVerifiedAt: '2026-04-01T00:00:00.000Z',
  };

  const mockPrismaService = {
    taskLog: {
      findMany: jest.fn(),
    },
  } as unknown as PrismaService & {
    taskLog: {
      findMany: jest.Mock;
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns recent assignment notifications for the current user', async () => {
    mockPrismaService.taskLog.findMany.mockResolvedValue([
      {
        id: 'log-2',
        createdAt: new Date('2026-04-07T01:15:00.000Z'),
        newValue: {
          id: 'member-2',
          name: 'Alex Chen',
        },
        actor: {
          id: 'owner-1',
          name: 'Jordan Lane',
        },
        task: {
          id: 'task-2',
          title: 'Prepare launch brief',
          project: {
            id: 'project-2',
            name: 'Launch board',
          },
        },
      },
      {
        id: 'log-1',
        createdAt: new Date('2026-04-07T01:05:00.000Z'),
        newValue: {
          id: 'member-2',
          name: 'Alex Chen',
        },
        actor: {
          id: 'owner-1',
          name: 'Jordan Lane',
        },
        task: {
          id: 'task-1',
          title: 'Draft QA notes',
          project: {
            id: 'project-1',
            name: 'QA readiness',
          },
        },
      },
    ]);

    const service = new TaskAssignmentNotificationsService(mockPrismaService);

    const result = await service.listAssignedTaskNotifications(currentUser);

    expect(mockPrismaService.taskLog.findMany).toHaveBeenCalledWith({
      where: {
        actorId: {
          not: 'member-2',
        },
        eventType: 'TASK_UPDATED',
        fieldName: 'assigneeId',
        task: {
          assigneeId: 'member-2',
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 25,
      select: expect.any(Object),
    });
    expect(result).toEqual({
      items: [
        {
          id: 'log-2',
          type: 'task_assigned',
          createdAt: '2026-04-07T01:15:00.000Z',
          actor: {
            id: 'owner-1',
            name: 'Jordan Lane',
          },
          project: {
            id: 'project-2',
            name: 'Launch board',
          },
          task: {
            id: 'task-2',
            title: 'Prepare launch brief',
          },
        },
        {
          id: 'log-1',
          type: 'task_assigned',
          createdAt: '2026-04-07T01:05:00.000Z',
          actor: {
            id: 'owner-1',
            name: 'Jordan Lane',
          },
          project: {
            id: 'project-1',
            name: 'QA readiness',
          },
          task: {
            id: 'task-1',
            title: 'Draft QA notes',
          },
        },
      ],
    });
  });

  it('filters out logs that do not assign the task to the current user and deduplicates by task', async () => {
    mockPrismaService.taskLog.findMany.mockResolvedValue([
      {
        id: 'log-ignore',
        createdAt: new Date('2026-04-07T01:25:00.000Z'),
        newValue: {
          id: 'member-3',
          name: 'Taylor Reed',
        },
        actor: {
          id: 'owner-1',
          name: 'Jordan Lane',
        },
        task: {
          id: 'task-1',
          title: 'Draft QA notes',
          project: {
            id: 'project-1',
            name: 'QA readiness',
          },
        },
      },
      {
        id: 'log-latest',
        createdAt: new Date('2026-04-07T01:20:00.000Z'),
        newValue: {
          id: 'member-2',
          name: 'Alex Chen',
        },
        actor: {
          id: 'owner-1',
          name: 'Jordan Lane',
        },
        task: {
          id: 'task-1',
          title: 'Draft QA notes',
          project: {
            id: 'project-1',
            name: 'QA readiness',
          },
        },
      },
      {
        id: 'log-older',
        createdAt: new Date('2026-04-07T01:10:00.000Z'),
        newValue: {
          id: 'member-2',
          name: 'Alex Chen',
        },
        actor: {
          id: 'owner-1',
          name: 'Jordan Lane',
        },
        task: {
          id: 'task-1',
          title: 'Draft QA notes',
          project: {
            id: 'project-1',
            name: 'QA readiness',
          },
        },
      },
    ]);

    const service = new TaskAssignmentNotificationsService(mockPrismaService);

    const result = await service.listAssignedTaskNotifications(currentUser);

    expect(result).toEqual({
      items: [
        {
          id: 'log-latest',
          type: 'task_assigned',
          createdAt: '2026-04-07T01:20:00.000Z',
          actor: {
            id: 'owner-1',
            name: 'Jordan Lane',
          },
          project: {
            id: 'project-1',
            name: 'QA readiness',
          },
          task: {
            id: 'task-1',
            title: 'Draft QA notes',
          },
        },
      ],
    });
  });
});
