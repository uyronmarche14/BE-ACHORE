import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  mapProjectTasksResponse,
  mapTaskResponse,
} from '../mapper/tasks.mapper';
import type {
  ProjectTasksResponse,
  TaskResponse,
} from '../types/task-response.type';
import {
  createTaskNotFoundException,
  projectTaskStatusSelect,
  taskResponseSelect,
} from './tasks.persistence';

@Injectable()
export class TaskQueriesService {
  constructor(private readonly prismaService: PrismaService) {}

  async listProjectTasks(projectId: string): Promise<ProjectTasksResponse> {
    const statuses = await this.prismaService.projectStatus.findMany({
      where: {
        projectId,
      },
      orderBy: {
        position: 'asc',
      },
      select: projectTaskStatusSelect,
    });

    return mapProjectTasksResponse(statuses);
  }

  async getTask(taskId: string): Promise<TaskResponse> {
    const task = await this.prismaService.task.findUnique({
      where: {
        id: taskId,
      },
      select: taskResponseSelect,
    });

    if (!task) {
      throw createTaskNotFoundException();
    }

    return mapTaskResponse(task);
  }
}
