import { NotFoundException, Injectable } from '@nestjs/common';
import { ProjectMemberRole } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { AuthUserResponse } from '../../auth/types/auth-response.type';
import type { CreateProjectDto } from '../dto/create-project.dto';
import type { UpdateProjectDto } from '../dto/update-project.dto';
import {
  createEmptyProjectTaskGroupRecords,
  mapDeleteProjectResponse,
  mapProjectDetailResponse,
  mapProjectListResponse,
  mapProjectSummaryResponse,
} from '../mapper/projects.mapper';
import type {
  DeleteProjectResponse,
  ProjectDetailMemberRecord,
  ProjectDetailResponse,
  ProjectDetailTaskRecord,
  ProjectListResponse,
  ProjectSummaryResponse,
  ProjectTaskGroupsRecord,
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
          select: projectSummarySelect,
        });

        await transaction.projectMember.create({
          data: {
            projectId: project.id,
            userId: currentUser.id,
            role: ProjectMemberRole.OWNER,
          },
        });

        return project;
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
      taskGroups: this.groupProjectTasks(project.tasks),
    });
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

  private groupProjectTasks(
    tasks: ProjectDetailTaskRecord[],
  ): ProjectTaskGroupsRecord {
    const taskGroups = createEmptyProjectTaskGroupRecords();

    for (const task of [...tasks].sort(compareProjectTasks)) {
      taskGroups[task.status].push(task);
    }

    return taskGroups;
  }

  private createProjectNotFoundException() {
    return new NotFoundException({
      code: 'NOT_FOUND',
      message: 'Project not found',
      details: null,
    });
  }
}

const projectSummarySelect = {
  id: true,
  name: true,
  description: true,
  ownerId: true,
  tasks: {
    select: {
      status: true,
    },
  },
} satisfies Record<string, unknown>;

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
  tasks: {
    select: {
      id: true,
      projectId: true,
      title: true,
      description: true,
      status: true,
      position: true,
      assigneeId: true,
      dueDate: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Record<string, unknown>;

function compareProjectMembers(
  left: ProjectDetailMemberRecord,
  right: ProjectDetailMemberRecord,
) {
  if (left.role !== right.role) {
    return left.role === ProjectMemberRole.OWNER ? -1 : 1;
  }

  return left.user.name.localeCompare(right.user.name);
}

function compareProjectTasks(
  left: ProjectDetailTaskRecord,
  right: ProjectDetailTaskRecord,
) {
  if (left.position !== null && right.position !== null) {
    if (left.position !== right.position) {
      return left.position - right.position;
    }
  } else if (left.position !== null) {
    return -1;
  } else if (right.position !== null) {
    return 1;
  }

  return left.createdAt.getTime() - right.createdAt.getTime();
}

function isPrismaRecordNotFoundError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2025'
  );
}
