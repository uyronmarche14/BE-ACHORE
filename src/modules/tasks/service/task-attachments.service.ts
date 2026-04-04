import { Injectable } from '@nestjs/common';
import {
  createForbiddenException,
  createNotFoundException,
} from '../../../common/utils/api-exception.util';
import { PrismaService } from '../../../database/prisma.service';
import type { AuthUserResponse } from '../../auth/types/auth-response.type';
import type { CreateTaskAttachmentDto } from '../dto/create-task-attachment.dto';
import type {
  TaskActionResponse,
  TaskAttachmentRecord,
  TaskAttachmentResponse,
  TaskAttachmentsResponse,
} from '../types/task-response.type';

@Injectable()
export class TaskAttachmentsService {
  constructor(private readonly prismaService: PrismaService) {}

  async listTaskAttachments(taskId: string): Promise<TaskAttachmentsResponse> {
    await this.assertTaskExists(taskId);

    const attachments = await this.prismaService.taskAttachment.findMany({
      where: {
        taskId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: taskAttachmentSelect,
    });

    return {
      items: attachments.map(mapTaskAttachmentResponse),
    };
  }

  async createTaskAttachment(
    currentUser: AuthUserResponse,
    taskId: string,
    createTaskAttachmentDto: CreateTaskAttachmentDto,
  ): Promise<TaskAttachmentResponse> {
    await this.assertTaskExists(taskId);

    const attachment = await this.prismaService.taskAttachment.create({
      data: {
        taskId,
        label: createTaskAttachmentDto.label,
        fileName: createTaskAttachmentDto.fileName,
        url: createTaskAttachmentDto.url,
        mimeType: createTaskAttachmentDto.mimeType ?? null,
        sizeBytes: createTaskAttachmentDto.sizeBytes ?? null,
        createdById: currentUser.id,
      },
      select: taskAttachmentSelect,
    });

    return mapTaskAttachmentResponse(attachment);
  }

  async deleteTaskAttachment(
    currentUser: AuthUserResponse,
    taskId: string,
    attachmentId: string,
  ): Promise<TaskActionResponse> {
    const attachment = await this.prismaService.taskAttachment.findFirst({
      where: {
        id: attachmentId,
        taskId,
      },
      select: {
        id: true,
        createdById: true,
      },
    });

    if (!attachment) {
      throw createNotFoundException({
        message: 'Task attachment not found',
      });
    }

    if (
      attachment.createdById !== currentUser.id &&
      currentUser.role !== 'ADMIN'
    ) {
      throw createForbiddenException({
        message: 'You do not have permission to delete this task attachment',
      });
    }

    await this.prismaService.taskAttachment.delete({
      where: {
        id: attachmentId,
      },
    });

    return {
      message: 'Task attachment deleted successfully',
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

const taskAttachmentSelect = {
  id: true,
  label: true,
  fileName: true,
  url: true,
  mimeType: true,
  sizeBytes: true,
  createdAt: true,
  createdBy: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

function mapTaskAttachmentResponse(
  attachment: TaskAttachmentRecord,
): TaskAttachmentResponse {
  return {
    id: attachment.id,
    label: attachment.label,
    fileName: attachment.fileName,
    url: attachment.url,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    createdAt: attachment.createdAt.toISOString(),
    createdBy: attachment.createdBy,
  };
}
