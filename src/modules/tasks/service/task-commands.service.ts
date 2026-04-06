import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createValidationException } from '../../../common/utils/api-exception.util';
import { PrismaService } from '../../../database/prisma.service';
import type { AuthUserResponse } from '../../auth/types/auth-response.type';
import {
  TaskLogsService,
  type TaskLogFieldChange,
} from '../../task-logs/service/task-logs.service';
import type { CreateTaskDto } from '../dto/create-task.dto';
import type { UpdateTaskDto } from '../dto/update-task.dto';
import type { UpdateTaskStatusDto } from '../dto/update-task-status.dto';
import { mapDeleteTaskResponse, mapTaskResponse } from '../mapper/tasks.mapper';
import type {
  DeleteTaskResponse,
  TaskResponse,
} from '../types/task-response.type';
import {
  createTaskNotFoundException,
  isPrismaRecordNotFoundError,
  normalizeTaskDueDate,
  summarizeChecklist,
  summarizeInputChecklist,
  summarizeInputLinks,
  summarizeLinks,
  taskResponseSelect,
  taskStatusComparisonSelect,
  taskStatusSelect,
  type TaskClient,
  updateTaskComparisonSelect,
  type UpdateTaskComparisonRecord,
} from './tasks.persistence';

@Injectable()
export class TaskCommandsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly taskLogsService: TaskLogsService,
  ) {}

  async createTask(
    currentUser: AuthUserResponse,
    projectId: string,
    createTaskDto: CreateTaskDto,
  ): Promise<TaskResponse> {
    // Validate cross-record references up front so the transaction only does the
    // actual create work once the project-scoped inputs are known to be valid.
    await Promise.all([
      this.assertValidAssignee(projectId, createTaskDto.assigneeId),
      this.assertValidParentTask(projectId, createTaskDto.parentTaskId),
    ]);

    return this.prismaService.$transaction(async (transactionClient) => {
      const status = createTaskDto.statusId
        ? await this.assertValidStatus(
            projectId,
            createTaskDto.statusId,
            transactionClient,
          )
        : await this.getDefaultStatus(transactionClient, projectId);
      const createdTask = await transactionClient.task.create({
        data: {
          projectId,
          title: createTaskDto.title,
          description: createTaskDto.description ?? null,
          acceptanceCriteria: createTaskDto.acceptanceCriteria ?? null,
          notes: createTaskDto.notes ?? null,
          parentTaskId: createTaskDto.parentTaskId ?? null,
          statusId: status.id,
          assigneeId: createTaskDto.assigneeId ?? null,
          dueDate: createTaskDto.dueDate
            ? new Date(createTaskDto.dueDate)
            : null,
          createdById: currentUser.id,
          links: {
            create: createTaskDto.links?.map((link, index) => ({
              label: link.label,
              url: link.url,
              position: index + 1,
            })),
          },
          checklistItems: {
            create: createTaskDto.checklistItems?.map((item, index) => ({
              label: item.label,
              isCompleted: item.isCompleted ?? false,
              position: index + 1,
            })),
          },
        },
        select: taskResponseSelect,
      });

      // Audit logs are created inside the same transaction so a task cannot appear
      // without its initial activity entry.
      await this.taskLogsService.createTaskCreatedLog(transactionClient, {
        actorId: currentUser.id,
        actorName: currentUser.name,
        taskId: createdTask.id,
      });

      if (createTaskDto.assigneeId) {
        await this.taskLogsService.createTaskUpdatedLogs(transactionClient, {
          actorId: currentUser.id,
          actorName: currentUser.name,
          taskId: createdTask.id,
          changes: [
            {
              fieldName: 'assigneeId',
              oldValue: null,
              newValue: await this.taskLogsService.getAssigneeLogValue(
                transactionClient,
                createTaskDto.assigneeId,
              ),
            },
          ],
        });
      }

      return mapTaskResponse(createdTask);
    });
  }

  async updateTask(
    currentUser: AuthUserResponse,
    taskId: string,
    updateTaskDto: UpdateTaskDto,
  ): Promise<TaskResponse> {
    const existingTask = await this.prismaService.task.findUnique({
      where: {
        id: taskId,
      },
      select: updateTaskComparisonSelect,
    });

    if (!existingTask) {
      throw createTaskNotFoundException();
    }

    await this.assertValidAssignee(
      existingTask.projectId,
      updateTaskDto.assigneeId,
    );

    try {
      return this.prismaService.$transaction(async (transactionClient) => {
        const changes = await this.buildTaskUpdateChanges(
          transactionClient,
          existingTask,
          updateTaskDto,
        );
        const updatedTask = await transactionClient.task.update({
          where: {
            id: taskId,
          },
          data: {
            ...(updateTaskDto.title !== undefined
              ? {
                  title: updateTaskDto.title,
                }
              : {}),
            ...(updateTaskDto.description !== undefined
              ? {
                  description: updateTaskDto.description,
                }
              : {}),
            ...(updateTaskDto.acceptanceCriteria !== undefined
              ? {
                  acceptanceCriteria: updateTaskDto.acceptanceCriteria,
                }
              : {}),
            ...(updateTaskDto.notes !== undefined
              ? {
                  notes: updateTaskDto.notes,
                }
              : {}),
            ...(updateTaskDto.assigneeId !== undefined
              ? {
                  assigneeId: updateTaskDto.assigneeId,
                }
              : {}),
            ...(updateTaskDto.dueDate !== undefined
              ? {
                  dueDate: updateTaskDto.dueDate
                    ? new Date(updateTaskDto.dueDate)
                    : null,
                }
              : {}),
            ...(updateTaskDto.links !== undefined
              ? {
                  links: {
                    deleteMany: {},
                    create: updateTaskDto.links.map((link, index) => ({
                      label: link.label,
                      url: link.url,
                      position: index + 1,
                    })),
                  },
                }
              : {}),
            ...(updateTaskDto.checklistItems !== undefined
              ? {
                  checklistItems: {
                    deleteMany: {},
                    create: updateTaskDto.checklistItems.map((item, index) => ({
                      label: item.label,
                      isCompleted: item.isCompleted ?? false,
                      position: index + 1,
                    })),
                  },
                }
              : {}),
            updatedById: currentUser.id,
          },
          select: taskResponseSelect,
        });

        // Field-level logs depend on the diff against the pre-update snapshot, so
        // build the changes before mutating the task record.
        await this.taskLogsService.createTaskUpdatedLogs(transactionClient, {
          actorId: currentUser.id,
          actorName: currentUser.name,
          taskId: updatedTask.id,
          changes,
        });

        return mapTaskResponse(updatedTask);
      });
    } catch (error) {
      if (isPrismaRecordNotFoundError(error)) {
        throw createTaskNotFoundException();
      }

      throw error;
    }
  }

  async updateTaskStatus(
    currentUser: AuthUserResponse,
    taskId: string,
    updateTaskStatusDto: UpdateTaskStatusDto,
  ): Promise<TaskResponse> {
    const existingTask = await this.prismaService.task.findUnique({
      where: {
        id: taskId,
      },
      select: taskStatusComparisonSelect,
    });

    if (!existingTask) {
      throw createTaskNotFoundException();
    }

    const nextStatus = await this.assertValidStatus(
      existingTask.projectId,
      updateTaskStatusDto.statusId,
    );

    try {
      return this.prismaService.$transaction(async (transactionClient) => {
        const updatedTask = await transactionClient.task.update({
          where: {
            id: taskId,
          },
          data: {
            statusId: nextStatus.id,
            position: updateTaskStatusDto.position ?? null,
            updatedById: currentUser.id,
          },
          select: taskResponseSelect,
        });

        // Reordering within the same lane should not create noisy status-change logs.
        if (existingTask.statusId !== nextStatus.id) {
          await this.taskLogsService.createStatusChangedLog(transactionClient, {
            actorId: currentUser.id,
            actorName: currentUser.name,
            taskId: updatedTask.id,
            previousStatusName: existingTask.status.name,
            nextStatusName: nextStatus.name,
          });
        }

        return mapTaskResponse(updatedTask);
      });
    } catch (error) {
      if (isPrismaRecordNotFoundError(error)) {
        throw createTaskNotFoundException();
      }

      throw error;
    }
  }

  async deleteTask(taskId: string): Promise<DeleteTaskResponse> {
    try {
      await this.prismaService.task.delete({
        where: {
          id: taskId,
        },
      });
    } catch (error) {
      if (isPrismaRecordNotFoundError(error)) {
        throw createTaskNotFoundException();
      }

      throw error;
    }

    return mapDeleteTaskResponse();
  }

  private async getDefaultStatus(
    prismaClient: Prisma.TransactionClient,
    projectId: string,
  ) {
    const status = await prismaClient.projectStatus.findFirst({
      where: {
        projectId,
      },
      orderBy: {
        position: 'asc',
      },
      select: taskStatusSelect,
    });

    if (!status) {
      throw createValidationException({
        message: 'Request validation failed',
        details: {
          statusId: ['Project does not have any available statuses'],
        },
      });
    }

    return status;
  }

  private async assertValidAssignee(
    projectId: string,
    assigneeId?: string | null,
  ) {
    if (assigneeId === undefined || assigneeId === null) {
      return;
    }

    const membership = await this.prismaService.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: assigneeId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!membership) {
      throw createValidationException({
        message: 'Request validation failed',
        details: {
          assigneeId: ['Assignee must be a member of the project'],
        },
      });
    }
  }

  private async assertValidParentTask(
    projectId: string,
    parentTaskId?: string | null,
  ) {
    if (!parentTaskId) {
      return;
    }

    const parentTask = await this.prismaService.task.findFirst({
      where: {
        id: parentTaskId,
        projectId,
      },
      select: {
        id: true,
      },
    });

    if (!parentTask) {
      throw createValidationException({
        message: 'Request validation failed',
        details: {
          parentTaskId: ['Parent task must belong to the same project'],
        },
      });
    }
  }

  private async assertValidStatus(
    projectId: string,
    statusId: string,
    prismaClient: TaskClient = this.prismaService,
  ) {
    const status = await prismaClient.projectStatus.findFirst({
      where: {
        id: statusId,
        projectId,
      },
      select: taskStatusSelect,
    });

    if (!status) {
      throw createValidationException({
        message: 'Request validation failed',
        details: {
          statusId: ['Status must belong to the project'],
        },
      });
    }

    return status;
  }

  private async buildTaskUpdateChanges(
    transactionClient: Prisma.TransactionClient,
    existingTask: UpdateTaskComparisonRecord,
    updateTaskDto: UpdateTaskDto,
  ): Promise<TaskLogFieldChange[]> {
    const changes: TaskLogFieldChange[] = [];

    if (
      updateTaskDto.title !== undefined &&
      updateTaskDto.title !== existingTask.title
    ) {
      changes.push({
        fieldName: 'title',
        oldValue: existingTask.title,
        newValue: updateTaskDto.title,
      });
    }

    if (
      updateTaskDto.description !== undefined &&
      updateTaskDto.description !== existingTask.description
    ) {
      changes.push({
        fieldName: 'description',
        oldValue: existingTask.description,
        newValue: updateTaskDto.description,
      });
    }

    if (
      updateTaskDto.acceptanceCriteria !== undefined &&
      updateTaskDto.acceptanceCriteria !== existingTask.acceptanceCriteria
    ) {
      changes.push({
        fieldName: 'acceptanceCriteria',
        oldValue: existingTask.acceptanceCriteria,
        newValue: updateTaskDto.acceptanceCriteria,
      });
    }

    if (
      updateTaskDto.notes !== undefined &&
      updateTaskDto.notes !== existingTask.notes
    ) {
      changes.push({
        fieldName: 'notes',
        oldValue: existingTask.notes,
        newValue: updateTaskDto.notes,
      });
    }

    if (
      updateTaskDto.dueDate !== undefined &&
      updateTaskDto.dueDate !== normalizeTaskDueDate(existingTask.dueDate)
    ) {
      changes.push({
        fieldName: 'dueDate',
        oldValue: normalizeTaskDueDate(existingTask.dueDate),
        newValue: updateTaskDto.dueDate,
      });
    }

    if (
      updateTaskDto.assigneeId !== undefined &&
      updateTaskDto.assigneeId !== existingTask.assigneeId
    ) {
      const [oldAssigneeValue, newAssigneeValue] = await Promise.all([
        this.taskLogsService.getAssigneeLogValue(
          transactionClient,
          existingTask.assigneeId,
        ),
        this.taskLogsService.getAssigneeLogValue(
          transactionClient,
          updateTaskDto.assigneeId ?? null,
        ),
      ]);

      changes.push({
        fieldName: 'assigneeId',
        oldValue: oldAssigneeValue,
        newValue: newAssigneeValue,
      });
    }

    if (updateTaskDto.links !== undefined) {
      const previousLinksSummary = summarizeLinks(existingTask.links);
      const nextLinksSummary = summarizeInputLinks(updateTaskDto.links);

      if (previousLinksSummary !== nextLinksSummary) {
        changes.push({
          fieldName: 'links',
          oldValue: previousLinksSummary,
          newValue: nextLinksSummary,
        });
      }
    }

    if (updateTaskDto.checklistItems !== undefined) {
      const previousChecklistSummary = summarizeChecklist(
        existingTask.checklistItems,
      );
      const nextChecklistSummary = summarizeInputChecklist(
        updateTaskDto.checklistItems,
      );

      if (previousChecklistSummary !== nextChecklistSummary) {
        changes.push({
          fieldName: 'checklistItems',
          oldValue: previousChecklistSummary,
          newValue: nextChecklistSummary,
        });
      }
    }

    return changes;
  }
}
