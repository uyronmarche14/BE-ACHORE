/* eslint-disable @typescript-eslint/unbound-method */

import { TaskStatus } from '@prisma/client';
import { TasksController } from './tasks.controller';
import { TasksService } from '../service/tasks.service';

describe('TasksController', () => {
  const tasksService = {
    listProjectTasks: jest.fn().mockResolvedValue({
      taskGroups: {
        TODO: [],
        IN_PROGRESS: [],
        DONE: [],
      },
    }),
    createTask: jest.fn().mockResolvedValue({
      id: 'task-1',
      projectId: 'project-1',
      title: 'Ship launch checklist',
      description: 'Final review before launch',
      status: TaskStatus.TODO,
      position: null,
      assigneeId: null,
      dueDate: null,
      createdAt: '2026-04-01T09:00:00.000Z',
      updatedAt: '2026-04-01T09:00:00.000Z',
    }),
    getTask: jest.fn().mockResolvedValue({
      id: 'task-1',
      projectId: 'project-1',
      title: 'Ship launch checklist',
      description: 'Final review before launch',
      status: TaskStatus.TODO,
      position: null,
      assigneeId: null,
      dueDate: null,
      createdAt: '2026-04-01T09:00:00.000Z',
      updatedAt: '2026-04-01T09:00:00.000Z',
    }),
    updateTask: jest.fn().mockResolvedValue({
      id: 'task-1',
      projectId: 'project-1',
      title: 'Review release notes',
      description: null,
      status: TaskStatus.TODO,
      position: null,
      assigneeId: null,
      dueDate: null,
      createdAt: '2026-04-01T09:00:00.000Z',
      updatedAt: '2026-04-02T10:00:00.000Z',
    }),
    updateTaskStatus: jest.fn().mockResolvedValue({
      id: 'task-1',
      projectId: 'project-1',
      title: 'Review release notes',
      description: null,
      status: TaskStatus.DONE,
      position: null,
      assigneeId: null,
      dueDate: null,
      createdAt: '2026-04-01T09:00:00.000Z',
      updatedAt: '2026-04-02T12:00:00.000Z',
    }),
    deleteTask: jest.fn().mockResolvedValue({
      message: 'Task deleted successfully',
    }),
  } as unknown as jest.Mocked<TasksService>;

  const tasksController = new TasksController(tasksService);

  const currentUser = {
    id: 'user-1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    role: 'MEMBER' as const,
    emailVerifiedAt: '2026-04-01T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists project tasks by route parameter', async () => {
    await tasksController.listProjectTasks('project-1');

    expect(tasksService.listProjectTasks).toHaveBeenCalledWith('project-1');
  });

  it('creates a task inside the route project for the current user', async () => {
    await tasksController.createTask(currentUser, 'project-1', {
      title: 'Ship launch checklist',
      description: 'Final review before launch',
    });

    expect(tasksService.createTask).toHaveBeenCalledWith(
      currentUser,
      'project-1',
      {
        title: 'Ship launch checklist',
        description: 'Final review before launch',
      },
    );
  });

  it('loads a task by route parameter', async () => {
    await tasksController.getTask('task-1');

    expect(tasksService.getTask).toHaveBeenCalledWith('task-1');
  });

  it('updates a task by route parameter', async () => {
    await tasksController.updateTask(currentUser, 'task-1', {
      description: null,
      dueDate: null,
    });

    expect(tasksService.updateTask).toHaveBeenCalledWith(
      currentUser,
      'task-1',
      {
        description: null,
        dueDate: null,
      },
    );
  });

  it('deletes a task by route parameter', async () => {
    await tasksController.deleteTask('task-1');

    expect(tasksService.deleteTask).toHaveBeenCalledWith('task-1');
  });

  it('patches a task status by route parameter', async () => {
    await tasksController.updateTaskStatus(currentUser, 'task-1', {
      status: TaskStatus.DONE,
      position: null,
    });

    expect(tasksService.updateTaskStatus).toHaveBeenCalledWith(
      currentUser,
      'task-1',
      {
        status: TaskStatus.DONE,
        position: null,
      },
    );
  });
});
