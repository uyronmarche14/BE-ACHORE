/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  const currentUser = {
    id: 'member-1',
    name: 'Member User',
    email: 'member@example.com',
    role: 'MEMBER' as const,
  };

  const mockPrismaService = {
    task: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    projectMember: {
      findUnique: jest.fn(),
    },
  } as unknown as PrismaService & {
    task: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    projectMember: {
      findUnique: jest.Mock;
    };
  };

  let tasksService: TasksService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaService.task.create.mockReset();
    mockPrismaService.task.findUnique.mockReset();
    mockPrismaService.task.update.mockReset();
    mockPrismaService.task.delete.mockReset();
    mockPrismaService.projectMember.findUnique.mockReset();

    tasksService = new TasksService(mockPrismaService);
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

  it('updates allowed task fields and stamps updatedById', async () => {
    mockPrismaService.task.findUnique.mockResolvedValue({
      projectId: 'project-1',
    });
    mockPrismaService.projectMember.findUnique.mockResolvedValue({
      id: 'membership-2',
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
