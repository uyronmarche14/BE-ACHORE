import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import type { AuthUserResponse } from '../../auth/types/auth-response.type';
import {
  mapProjectDetailResponse,
  mapProjectListResponse,
} from '../mapper/projects.mapper';
import type {
  ProjectDetailResponse,
  ProjectListResponse,
} from '../types/project-response.type';
import {
  compareProjectMembers,
  createProjectNotFoundException,
  projectDetailSelect,
  projectSummarySelect,
} from './projects.persistence';

@Injectable()
export class ProjectQueriesService {
  constructor(private readonly prismaService: PrismaService) {}

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
      throw createProjectNotFoundException();
    }

    return mapProjectDetailResponse({
      id: project.id,
      name: project.name,
      description: project.description,
      members: [...project.members].sort(compareProjectMembers),
      statuses: project.statuses,
    });
  }
}
