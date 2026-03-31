import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    return new ForbiddenException({
      code: 'FORBIDDEN',
      message: 'Only the project owner can perform this action',
      details: null,
    });
  }

  private createProjectAccessForbiddenException() {
    return new ForbiddenException({
      code: 'FORBIDDEN',
      message: 'You do not have access to this project',
      details: null,
    });
  }

  private createTaskAccessForbiddenException() {
    return new ForbiddenException({
      code: 'FORBIDDEN',
      message: 'You do not have access to this task',
      details: null,
    });
  }

  private createProjectNotFoundException() {
    return new NotFoundException({
      code: 'NOT_FOUND',
      message: 'Project not found',
      details: null,
    });
  }

  private createTaskNotFoundException() {
    return new NotFoundException({
      code: 'NOT_FOUND',
      message: 'Task not found',
      details: null,
    });
  }
}
