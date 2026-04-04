import { Injectable } from '@nestjs/common';
import { Prisma, ProjectMemberRole } from '@prisma/client';
import {
  createConflictException,
  createNotFoundException,
} from '../../../common/utils/api-exception.util';
import { PrismaService } from '../../../database/prisma.service';
import type { AuthUserResponse } from '../../auth/types/auth-response.type';
import { DEFAULT_PROJECT_STATUS_DEFINITIONS } from '../constants/project-status.constants';
import type { CreateProjectDto } from '../dto/create-project.dto';
import type { CreateProjectStatusDto } from '../dto/create-project-status.dto';
import type { GetProjectActivityQueryDto } from '../dto/get-project-activity-query.dto';
import type { UpdateProjectDto } from '../dto/update-project.dto';
import {
  mapDeleteProjectResponse,
  mapProjectActivityResponse,
  mapProjectDetailResponse,
  mapProjectListResponse,
  mapProjectSummaryResponse,
} from '../mapper/projects.mapper';
import type {
  DeleteProjectResponse,
  ProjectActivityResponse,
  ProjectDetailMemberRecord,
  ProjectDetailResponse,
  ProjectListResponse,
  ProjectStatusSummaryResponse,
  ProjectSummaryResponse,
} from '../types/project-response.type';

@Injectable()
export class ProjectsService {
  constructor(private readonly prismaService: PrismaService) {}

  async createProject(
    currentUser: AuthUserResponse,
    createProjectDto: CreateProjectDto,
  ): Promise<ProjectSummaryResponse> {
    const createdProject = await this.prismaService.$transaction(
      async (transaction) => {
        const project = await transaction.project.create({
          data: {
            name: createProjectDto.name,
            description: createProjectDto.description ?? null,
            ownerId: currentUser.id,
          },
          select: {
            id: true,
          },
        });

        await transaction.projectMember.create({
          data: {
            projectId: project.id,
            userId: currentUser.id,
            role: ProjectMemberRole.OWNER,
          },
        });
        await transaction.projectStatus.createMany({
          data: DEFAULT_PROJECT_STATUS_DEFINITIONS.map((status) => ({
            projectId: project.id,
            name: status.name,
            position: status.position,
            isClosed: status.isClosed,
          })),
        });

        return transaction.project.findUniqueOrThrow({
          where: {
            id: project.id,
          },
          select: projectSummarySelect,
        });
      },
    );

    return mapProjectSummaryResponse(createdProject, currentUser.id);
  }

  async listProjects(
    currentUser: AuthUserResponse,
  ): Promise<ProjectListResponse> {
    const projects = await this.prismaService.project.findMany({
      where:
        currentUser.role === 'ADMIN'
          ? undefined
          : {
              OR: [
                {
                  ownerId: currentUser.id,
                },
                {
                  members: {
                    some: {
                      userId: currentUser.id,
                    },
                  },
                },
              ],
            },
      orderBy: {
        updatedAt: 'desc',
      },
      select: projectSummarySelect,
    });

    return mapProjectListResponse(projects, currentUser.id);
  }

  async getProjectDetail(projectId: string): Promise<ProjectDetailResponse> {
    const project = await this.prismaService.project.findUnique({
      where: {
        id: projectId,
      },
      select: projectDetailSelect,
    });

    if (!project) {
      throw this.createProjectNotFoundException();
    }

    return mapProjectDetailResponse({
      id: project.id,
      name: project.name,
      description: project.description,
      members: [...project.members].sort(compareProjectMembers),
      statuses: project.statuses,
    });
  }

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

          return transaction.projectStatus.create({
            data: {
              projectId,
              name: createProjectStatusDto.name,
              position: (lastStatus?.position ?? 0) + 1,
              isClosed: createProjectStatusDto.isClosed ?? false,
            },
            select: {
              id: true,
              name: true,
              position: true,
              isClosed: true,
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

  async updateProject(
    currentUser: AuthUserResponse,
    projectId: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<ProjectSummaryResponse> {
    try {
      const project = await this.prismaService.project.update({
        where: {
          id: projectId,
        },
        data: {
          ...(updateProjectDto.name !== undefined
            ? {
                name: updateProjectDto.name,
              }
            : {}),
          ...(updateProjectDto.description !== undefined
            ? {
                description: updateProjectDto.description,
              }
            : {}),
        },
        select: projectSummarySelect,
      });

      return mapProjectSummaryResponse(project, currentUser.id);
    } catch (error) {
      if (isPrismaRecordNotFoundError(error)) {
        throw this.createProjectNotFoundException();
      }

      throw error;
    }
  }

  async deleteProject(projectId: string): Promise<DeleteProjectResponse> {
    try {
      await this.prismaService.project.delete({
        where: {
          id: projectId,
        },
      });
    } catch (error) {
      if (isPrismaRecordNotFoundError(error)) {
        throw this.createProjectNotFoundException();
      }

      throw error;
    }

    return mapDeleteProjectResponse();
  }

  async getProjectActivity(
    projectId: string,
    query: GetProjectActivityQueryDto,
  ): Promise<ProjectActivityResponse> {
    await this.assertProjectExists(projectId);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const offset = (page - 1) * pageSize;

    const activityItems = await this.prismaService.taskLog.findMany({
      where: {
        task: {
          projectId,
        },
        ...(query.eventType
          ? {
              eventType: query.eventType,
            }
          : {}),
        ...(query.q
          ? {
              OR: [
                {
                  summary: {
                    contains: query.q,
                  },
                },
                {
                  task: {
                    title: {
                      contains: query.q,
                    },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: offset,
      take: pageSize + 1,
      select: projectActivitySelect,
    });

    return mapProjectActivityResponse({
      items: activityItems.slice(0, pageSize),
      page,
      pageSize,
      hasMore: activityItems.length > pageSize,
    });
  }

  private createProjectNotFoundException() {
    return createNotFoundException({
      message: 'Project not found',
    });
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
      throw this.createProjectNotFoundException();
    }
  }
}

const projectSummarySelect = {
  id: true,
  name: true,
  description: true,
  ownerId: true,
  statuses: {
    orderBy: {
      position: 'asc',
    },
    select: {
      id: true,
      name: true,
      position: true,
      isClosed: true,
      tasks: {
        select: {
          id: true,
        },
      },
    },
  },
} satisfies Prisma.ProjectSelect;

const projectDetailTaskSelect = {
  id: true,
  projectId: true,
  title: true,
  description: true,
  statusId: true,
  status: {
    select: {
      id: true,
      name: true,
      position: true,
      isClosed: true,
    },
  },
  position: true,
  assigneeId: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TaskSelect;

const projectDetailSelect = {
  id: true,
  name: true,
  description: true,
  members: {
    select: {
      role: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  statuses: {
    orderBy: {
      position: 'asc',
    },
    select: {
      id: true,
      name: true,
      position: true,
      isClosed: true,
      tasks: {
        select: projectDetailTaskSelect,
      },
    },
  },
} satisfies Prisma.ProjectSelect;

const projectActivitySelect = {
  id: true,
  eventType: true,
  fieldName: true,
  oldValue: true,
  newValue: true,
  summary: true,
  createdAt: true,
  actor: {
    select: {
      id: true,
      name: true,
    },
  },
  task: {
    select: {
      id: true,
      title: true,
      statusId: true,
      status: {
        select: {
          name: true,
          isClosed: true,
        },
      },
    },
  },
} satisfies Prisma.TaskLogSelect;

function compareProjectMembers(
  left: ProjectDetailMemberRecord,
  right: ProjectDetailMemberRecord,
) {
  if (left.role !== right.role) {
    return left.role === ProjectMemberRole.OWNER ? -1 : 1;
  }

  return left.user.name.localeCompare(right.user.name);
}

function isPrismaRecordNotFoundError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2025'
  );
}

function isPrismaUniqueConstraintError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}
