/* eslint-disable @typescript-eslint/unbound-method */

import { TaskLogEventType } from '@prisma/client';
import { TaskLogsController } from './task-logs.controller';
import { TaskLogsService } from '../service/task-logs.service';

describe('TaskLogsController', () => {
  const taskLogsService = {
    listTaskLogs: jest.fn().mockResolvedValue({
      items: [
        {
          id: 'log-1',
          eventType: TaskLogEventType.STATUS_CHANGED,
          fieldName: 'status',
          oldValue: 'TODO',
          newValue: 'IN_PROGRESS',
          summary: 'Jane Doe moved the task from Todo to In progress',
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
    }),
  } as unknown as jest.Mocked<TaskLogsService>;

  const taskLogsController = new TaskLogsController(taskLogsService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists logs for the route task parameter', async () => {
    await taskLogsController.listTaskLogs('task-1', {});

    expect(taskLogsService.listTaskLogs).toHaveBeenCalledWith('task-1', {});
  });
});
