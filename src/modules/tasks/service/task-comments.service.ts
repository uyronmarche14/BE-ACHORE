import { Injectable } from '@nestjs/common';
import {
  createForbiddenException,
  createNotFoundException,
} from '../../../common/utils/api-exception.util';
import { PrismaService } from '../../../database/prisma.service';
import type { AuthUserResponse } from '../../auth/types/auth-response.type';
import type { CreateTaskCommentDto } from '../dto/create-task-comment.dto';
import type { UpdateTaskCommentDto } from '../dto/update-task-comment.dto';
import type {
  TaskActionResponse,
  TaskCommentRecord,
  TaskCommentResponse,
  TaskCommentsResponse,
} from '../types/task-response.type';

@Injectable()
export class TaskCommentsService {
  constructor(private readonly prismaService: PrismaService) {}

  async listTaskComments(taskId: string): Promise<TaskCommentsResponse> {
    await this.assertTaskExists(taskId);

    const comments = await this.prismaService.taskComment.findMany({
      where: {
        taskId,
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: taskCommentSelect,
    });

    return {
      items: comments.map(mapTaskCommentResponse),
    };
  }

  async createTaskComment(
    currentUser: AuthUserResponse,
    taskId: string,
    createTaskCommentDto: CreateTaskCommentDto,
  ): Promise<TaskCommentResponse> {
    await this.assertTaskExists(taskId);

    const comment = await this.prismaService.taskComment.create({
      data: {
        taskId,
        authorId: currentUser.id,
        body: createTaskCommentDto.body,
      },
      select: taskCommentSelect,
    });

    return mapTaskCommentResponse(comment);
  }

  async updateTaskComment(
    currentUser: AuthUserResponse,
    taskId: string,
    commentId: string,
    updateTaskCommentDto: UpdateTaskCommentDto,
  ): Promise<TaskCommentResponse> {
    const existingComment = await this.prismaService.taskComment.findFirst({
      where: {
        id: commentId,
        taskId,
      },
      select: {
        id: true,
        authorId: true,
      },
    });

    if (!existingComment) {
      throw createNotFoundException({
        message: 'Task comment not found',
      });
    }

    if (
      existingComment.authorId !== currentUser.id &&
      currentUser.role !== 'ADMIN'
    ) {
      throw createForbiddenException({
        message: 'You do not have permission to edit this task comment',
      });
    }

    const updatedComment = await this.prismaService.taskComment.update({
      where: {
        id: commentId,
      },
      data: {
        body: updateTaskCommentDto.body,
      },
      select: taskCommentSelect,
    });

    return mapTaskCommentResponse(updatedComment);
  }

  async deleteTaskComment(
    currentUser: AuthUserResponse,
    taskId: string,
    commentId: string,
  ): Promise<TaskActionResponse> {
    const existingComment = await this.prismaService.taskComment.findFirst({
      where: {
        id: commentId,
        taskId,
      },
      select: {
        id: true,
        authorId: true,
      },
    });

    if (!existingComment) {
      throw createNotFoundException({
        message: 'Task comment not found',
      });
    }

    if (
      existingComment.authorId !== currentUser.id &&
      currentUser.role !== 'ADMIN'
    ) {
      throw createForbiddenException({
        message: 'You do not have permission to delete this task comment',
      });
    }

    await this.prismaService.taskComment.delete({
      where: {
        id: commentId,
      },
    });

    return {
      message: 'Task comment deleted successfully',
    };
  }

  private async assertTaskExists(taskId: string) {
    const task = await this.prismaService.task.findUnique({
      where: {
        id: taskId,
      },
      select: {
        id: true,
      },
    });

    if (!task) {
      throw createNotFoundException({
        message: 'Task not found',
      });
    }
  }
}

const taskCommentSelect = {
  id: true,
  body: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

function mapTaskCommentResponse(
  comment: TaskCommentRecord,
): TaskCommentResponse {
  return {
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    author: comment.author,
  };
}
