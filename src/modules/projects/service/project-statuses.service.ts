import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createConflictException } from '../../../common/utils/api-exception.util';
import { PrismaService } from '../../../database/prisma.service';
import type { CreateProjectStatusDto } from '../dto/create-project-status.dto';
import type { DeleteProjectStatusDto } from '../dto/delete-project-status.dto';
import type { ReorderProjectStatusesDto } from '../dto/reorder-project-statuses.dto';
import type { UpdateProjectStatusDto } from '../dto/update-project-status.dto';
import type {
  DeleteProjectResponse,
  ProjectStatusListResponse,
  ProjectStatusSummaryResponse,
  ProjectSummaryStatusRecord,
} from '../types/project-response.type';
import {
  createProjectNotFoundException,
  isPrismaRecordNotFoundError,
  isPrismaUniqueConstraintError,
  projectStatusSummarySelect,
} from './projects.persistence';

@Injectable()
export class ProjectStatusesService {
  constructor(private readonly prismaService: PrismaService) {}

  async createProjectStatus(
    projectId: string,
    createProjectStatusDto: CreateProjectStatusDto,
  ): Promise<ProjectStatusSummaryResponse> {
    await this.assertProjectExists(projectId);

    try {
      const createdStatus = await this.prismaService.$transaction(
        async (transaction) => {
          const lastStatus = await transaction.projectStatus.findFirst({
            where: {
              projectId,
            },
            orderBy: {
              position: 'desc',
            },
            select: {
              position: true,
            },
          });

          // New statuses always append to the current workflow order so the board
          // does not reshuffle existing lanes on creation.
          return transaction.projectStatus.create({
            data: {
              projectId,
              name: createProjectStatusDto.name,
              position: (lastStatus?.position ?? 0) + 1,
              isClosed: createProjectStatusDto.isClosed ?? false,
              color:
                createProjectStatusDto.color ??
                (createProjectStatusDto.isClosed ? 'GREEN' : 'BLUE'),
            },
            select: {
              id: true,
              name: true,
              position: true,
              isClosed: true,
              color: true,
            },
          });
        },
      );

      return {
        ...createdStatus,
        taskCount: 0,
      };
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw createConflictException({
          message: 'A status with this name already exists for the project',
        });
      }

      throw error;
    }
  }

  async updateProjectStatus(
    projectId: string,
    statusId: string,
    updateProjectStatusDto: UpdateProjectStatusDto,
  ): Promise<ProjectStatusSummaryResponse> {
    await this.assertProjectStatusExists(projectId, statusId);

    try {
      const updatedStatus = await this.prismaService.projectStatus.update({
        where: {
          id: statusId,
        },
        data: {
          ...(updateProjectStatusDto.name !== undefined
            ? {
                name: updateProjectStatusDto.name,
              }
            : {}),
          ...(updateProjectStatusDto.color !== undefined
            ? {
                color: updateProjectStatusDto.color,
              }
            : {}),
          ...(updateProjectStatusDto.isClosed !== undefined
            ? {
                isClosed: updateProjectStatusDto.isClosed,
              }
            : {}),
        },
        select: projectStatusSummarySelect,
      });

      return this.toProjectStatusSummaryResponse(updatedStatus);
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw createConflictException({
          message: 'A status with this name already exists for the project',
        });
      }

      if (isPrismaRecordNotFoundError(error)) {
        throw createProjectNotFoundException();
      }

      throw error;
    }
  }

  async reorderProjectStatuses(
    projectId: string,
    reorderProjectStatusesDto: ReorderProjectStatusesDto,
  ): Promise<ProjectStatusListResponse> {
    const existingStatuses = await this.prismaService.projectStatus.findMany({
      where: {
        projectId,
      },
      orderBy: {
        position: 'asc',
      },
      select: {
        id: true,
      },
    });

    if (existingStatuses.length === 0) {
      throw createProjectNotFoundException();
    }

    const existingStatusIds = existingStatuses.map((status) => status.id);
    const requestedStatusIds = reorderProjectStatusesDto.statuses.map(
      (status) => status.id,
    );

    if (
      existingStatusIds.length !== requestedStatusIds.length ||
      existingStatusIds.some(
        (statusId) => !requestedStatusIds.includes(statusId),
      )
    ) {
      // Reorder is all-or-nothing so partial payloads cannot accidentally drop or
      // duplicate lanes when the board submits a stale list.
      throw createConflictException({
        message:
          'Status reorder payload must include every project status exactly once',
      });
    }

    const reorderedStatuses = await this.prismaService.$transaction(
      async (transaction) => {
        await this.resequenceProjectStatuses(transaction, requestedStatusIds);

        return transaction.projectStatus.findMany({
          where: {
            projectId,
          },
          orderBy: {
            position: 'asc',
          },
          select: projectStatusSummarySelect,
        });
      },
    );

    return {
      items: reorderedStatuses.map((status) =>
        this.toProjectStatusSummaryResponse(status),
      ),
    };
  }

  async deleteProjectStatus(
    projectId: string,
    statusId: string,
    deleteProjectStatusDto: DeleteProjectStatusDto,
  ): Promise<DeleteProjectResponse> {
    const existingStatuses = await this.prismaService.projectStatus.findMany({
      where: {
        projectId,
      },
      orderBy: {
        position: 'asc',
      },
      select: {
        id: true,
      },
    });

    if (!existingStatuses.some((status) => status.id === statusId)) {
      throw createProjectNotFoundException();
    }

    if (existingStatuses.length <= 1) {
      throw createConflictException({
        message: 'Projects must keep at least one workflow status',
      });
    }

    if (statusId === deleteProjectStatusDto.moveToStatusId) {
      throw createConflictException({
        message:
          'moveToStatusId must be a different status in the same project',
      });
    }

    if (
      !existingStatuses.some(
        (status) => status.id === deleteProjectStatusDto.moveToStatusId,
      )
    ) {
      throw createConflictException({
        message: 'moveToStatusId must belong to the same project',
      });
    }

    await this.prismaService.$transaction(async (transaction) => {
      // Move tasks first and delete the lane second so project tasks never point at
      // a status that no longer exists.
      await transaction.task.updateMany({
        where: {
          statusId,
        },
        data: {
          statusId: deleteProjectStatusDto.moveToStatusId,
        },
      });

      await transaction.projectStatus.delete({
        where: {
          id: statusId,
        },
      });

      const remainingStatuses = await transaction.projectStatus.findMany({
        where: {
          projectId,
        },
        orderBy: {
          position: 'asc',
        },
        select: {
          id: true,
        },
      });

      await this.resequenceProjectStatuses(
        transaction,
        remainingStatuses.map((status) => status.id),
      );
    });

    return {
      message: 'Project status deleted successfully',
    };
  }

  private async assertProjectExists(projectId: string) {
    const project = await this.prismaService.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        id: true,
      },
    });

    if (!project) {
      throw createProjectNotFoundException();
    }
  }

  private async assertProjectStatusExists(projectId: string, statusId: string) {
    const status = await this.prismaService.projectStatus.findFirst({
      where: {
        id: statusId,
        projectId,
      },
      select: {
        id: true,
      },
    });

    if (!status) {
      throw createProjectNotFoundException();
    }
  }

  private async resequenceProjectStatuses(
    transaction: Prisma.TransactionClient,
    statusIds: string[],
  ) {
    for (const [index, statusId] of statusIds.entries()) {
      await transaction.projectStatus.update({
        where: {
          id: statusId,
        },
        data: {
          position: -(index + 1),
        },
      });
    }

    for (const [index, statusId] of statusIds.entries()) {
      await transaction.projectStatus.update({
        where: {
          id: statusId,
        },
        data: {
          position: index + 1,
        },
      });
    }
  }

  private toProjectStatusSummaryResponse(
    status: ProjectSummaryStatusRecord,
  ): ProjectStatusSummaryResponse {
    return {
      id: status.id,
      name: status.name,
      position: status.position,
      isClosed: status.isClosed,
      color: status.color,
      taskCount: status.tasks.length,
    };
  }
}
