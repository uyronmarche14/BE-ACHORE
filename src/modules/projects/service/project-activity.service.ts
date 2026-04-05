import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import type { GetProjectActivityQueryDto } from '../dto/get-project-activity-query.dto';
import { mapProjectActivityResponse } from '../mapper/projects.mapper';
import type { ProjectActivityResponse } from '../types/project-response.type';
import {
  createProjectNotFoundException,
  projectActivitySelect,
} from './projects.persistence';

@Injectable()
export class ProjectActivityService {
  constructor(private readonly prismaService: PrismaService) {}

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
}
