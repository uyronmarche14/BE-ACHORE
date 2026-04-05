import { Injectable } from '@nestjs/common';
import {
  createForbiddenException,
  createNotFoundException,
} from '../../../common/utils/api-exception.util';
import { PrismaService } from '../../../database/prisma.service';
import type {
  AuthorizedProjectContext,
  AuthorizedTaskContext,
} from '../types/authenticated-request.type';
import type { AuthUserResponse } from '../types/auth-response.type';

@Injectable()
export class ResourceAuthorizationService {
  constructor(private readonly prismaService: PrismaService) {}

  async assertProjectAccess(
    projectId: string,
    user: AuthUserResponse,
    options: {
      ownerOnly: boolean;
    },
  ): Promise<AuthorizedProjectContext> {
    const project = await this.prismaService.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!project) {
      throw this.createProjectNotFoundException();
    }

    if (user.role === 'ADMIN') {
      return {
        projectId: project.id,
        ownerId: project.ownerId,
      };
    }

    if (project.ownerId === user.id) {
      return {
        projectId: project.id,
        ownerId: project.ownerId,
      };
    }

    // Owner-only actions intentionally skip membership fallback so shared project
    // members cannot manage owner-scoped settings.
    if (options.ownerOnly) {
      throw this.createOwnerRequiredException();
    }

    const membership = await this.prismaService.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: user.id,
        },
      },
      select: {
        id: true,
      },
    });

    if (!membership) {
      throw this.createProjectAccessForbiddenException();
    }

    return {
      projectId: project.id,
      ownerId: project.ownerId,
    };
  }

  async assertTaskAccess(
    taskId: string,
    user: AuthUserResponse,
  ): Promise<AuthorizedTaskContext> {
    const task = await this.prismaService.task.findUnique({
      where: {
        id: taskId,
      },
      select: {
        id: true,
        projectId: true,
        project: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!task) {
      throw this.createTaskNotFoundException();
    }

    if (user.role === 'ADMIN' || task.project.ownerId === user.id) {
      return {
        taskId: task.id,
        projectId: task.projectId,
      };
    }

    // Task access inherits project membership rather than task-level ACLs, which
    // keeps authorization consistent across board, drawer, comments, and files.
    const membership = await this.prismaService.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: task.projectId,
          userId: user.id,
        },
      },
      select: {
        id: true,
      },
    });

    if (!membership) {
      throw this.createTaskAccessForbiddenException();
    }

    return {
      taskId: task.id,
      projectId: task.projectId,
    };
  }

  private createOwnerRequiredException() {
    return createForbiddenException({
      message: 'Only the project owner can perform this action',
    });
  }

  private createProjectAccessForbiddenException() {
    return createForbiddenException({
      message: 'You do not have access to this project',
    });
  }

  private createTaskAccessForbiddenException() {
    return createForbiddenException({
      message: 'You do not have access to this task',
    });
  }

  private createProjectNotFoundException() {
    return createNotFoundException({
      message: 'Project not found',
    });
  }

  private createTaskNotFoundException() {
    return createNotFoundException({
      message: 'Task not found',
    });
  }
}
