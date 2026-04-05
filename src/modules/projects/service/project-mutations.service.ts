import { Injectable } from '@nestjs/common';
import { ProjectMemberRole } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { AuthUserResponse } from '../../auth/types/auth-response.type';
import { DEFAULT_PROJECT_STATUS_DEFINITIONS } from '../constants/project-status.constants';
import type { CreateProjectDto } from '../dto/create-project.dto';
import type { UpdateProjectDto } from '../dto/update-project.dto';
import {
  mapDeleteProjectResponse,
  mapProjectSummaryResponse,
} from '../mapper/projects.mapper';
import type {
  DeleteProjectResponse,
  ProjectSummaryResponse,
} from '../types/project-response.type';
import {
  createProjectNotFoundException,
  isPrismaRecordNotFoundError,
  projectSummarySelect,
} from './projects.persistence';

@Injectable()
export class ProjectMutationsService {
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
            color: status.color,
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
        throw createProjectNotFoundException();
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
        throw createProjectNotFoundException();
      }

      throw error;
    }

    return mapDeleteProjectResponse();
  }
}
